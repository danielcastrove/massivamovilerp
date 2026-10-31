import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";
import {
  formatPhoneParaEnvio,
  isValidEmail,
  isValidPhone,
  normalizeValor,
} from "@/lib/contacts";

type Canal = "SMS" | "WHATSAPP" | "EMAIL";
type Destino = "principal" | "contacto" | "cobranza";
type Entidad = "customers" | "leads";

const MAX_IDS = 200;
const DELAY_MS_ENTRE_ENVIOS = 250;

const destinoLabels: Record<Destino, string> = {
  principal: "el contacto principal",
  contacto: "la persona de contacto",
  cobranza: "la persona de cobranza",
};

interface EntidadContacto {
  id: string;
  name: string;
  telefono_empresa?: string | null;
  telefono_celular?: string | null;
  email?: string | null;
  persona_contacto_info?: unknown;
  persona_cobranza_info?: unknown;
}

function resolverDestino(e: EntidadContacto, entidad: Entidad, destino: Destino, esTelefono: boolean): string {
  if (entidad === "leads") {
    return esTelefono ? e.telefono_celular || "" : e.email || "";
  }
  const contacto = e.persona_contacto_info as any;
  const cobranza = e.persona_cobranza_info as any;
  if (destino === "contacto") {
    return esTelefono ? contacto?.telefono || contacto?.telefono_celular || "" : contacto?.email || "";
  }
  if (destino === "cobranza") {
    return esTelefono ? cobranza?.telefono || cobranza?.telefono_celular || "" : cobranza?.email || "";
  }
  return esTelefono ? e.telefono_empresa || e.telefono_celular || "" : e.email || "";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entity, ids, channel, destino, message, subject } = body as {
      entity?: Entidad;
      ids?: string[];
      channel?: Canal;
      destino?: Destino;
      message?: string;
      subject?: string;
    };

    if (entity !== "customers" && entity !== "leads") {
      return NextResponse.json({ message: "Entidad inválida." }, { status: 400 });
    }

    if (!channel || !["SMS", "WHATSAPP", "EMAIL"].includes(channel)) {
      return NextResponse.json({ message: "Canal inválido." }, { status: 400 });
    }

    if (!destino || !["principal", "contacto", "cobranza"].includes(destino)) {
      return NextResponse.json({ message: "Destino inválido." }, { status: 400 });
    }

    // Los leads no tienen persona de contacto/cobranza propia: solo destino principal
    if (entity === "leads" && destino !== "principal") {
      return NextResponse.json(
        { message: "Para los leads solo está disponible el destino principal." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ message: "El mensaje es requerido." }, { status: 400 });
    }

    if (channel === "EMAIL" && (!subject || typeof subject !== "string" || subject.trim().length === 0)) {
      return NextResponse.json({ message: "El asunto es requerido para email." }, { status: 400 });
    }

    if (channel === "SMS" && message.length > 160) {
      return NextResponse.json({ message: "El SMS no puede exceder 160 caracteres." }, { status: 400 });
    }

    if (channel === "WHATSAPP" && message.length > 1000) {
      return NextResponse.json({ message: "El mensaje de WhatsApp no puede exceder 1000 caracteres." }, { status: 400 });
    }

    if (!Array.isArray(ids) || ids.filter((id) => typeof id === "string" && id).length === 0) {
      return NextResponse.json({ message: "Debe indicar al menos un destinatario." }, { status: 400 });
    }

    const limpios = Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && !!id)));
    if (limpios.length > MAX_IDS) {
      return NextResponse.json(
        { message: `Máximo ${MAX_IDS} destinatarios por envío. La lista tiene ${limpios.length}.` },
        { status: 400 }
      );
    }

    const entities: EntidadContacto[] =
      entity === "customers"
        ? await prisma.customer.findMany({
            where: { id: { in: limpios } },
            select: {
              id: true,
              name: true,
              email: true,
              telefono_empresa: true,
              telefono_celular: true,
              persona_contacto_info: true,
              persona_cobranza_info: true,
            },
          })
        : await prisma.lead.findMany({
            where: { id: { in: limpios } },
            select: { id: true, nombre: true, apellido: true, email: true, telefono: true },
          }).then((leads) =>
            leads.map((l) => ({
              id: l.id,
              name: `${l.nombre} ${l.apellido}`.trim(),
              email: l.email,
              telefono_celular: l.telefono,
            }))
          );

    if (entities.length === 0) {
      return NextResponse.json({ message: "No se encontraron destinatarios." }, { status: 404 });
    }

    const esTelefono = channel === "SMS" || channel === "WHATSAPP";
    const html = channel === "EMAIL";
    const cuerpo = html ? `<p>${message.replace(/\n/g, "<br/>")}</p>` : message;

    let enviados = 0;
    let fallidos = 0;
    let sinDestino = 0;
    const vistos = new Set<string>();
    const detalles: Array<{ id: string; name: string; ok: boolean; detalle: string }> = [];

    for (const e of entities) {
      const bruto = resolverDestino(e, entity, destino, esTelefono).trim();

      if (!bruto) {
        sinDestino++;
        detalles.push({ id: e.id, name: e.name, ok: false, detalle: `Sin ${esTelefono ? "teléfono" : "correo"} de ${destinoLabels[destino]}` });
        continue;
      }

      if (esTelefono ? !isValidPhone(bruto) : !isValidEmail(bruto)) {
        sinDestino++;
        detalles.push({ id: e.id, name: e.name, ok: false, detalle: `${esTelefono ? "Teléfono" : "Correo"} inválido: ${bruto}` });
        continue;
      }

      const destinoFinal = esTelefono ? formatPhoneParaEnvio(bruto) : bruto;
      const key = normalizeValor(destinoFinal, esTelefono ? "PHONE" : "EMAIL");
      if (!key || vistos.has(key)) {
        sinDestino++;
        detalles.push({ id: e.id, name: e.name, ok: false, detalle: `Destinatario repetido: ${destinoFinal}` });
        continue;
      }
      vistos.add(key);

      const result = await sendNotification({
        to: destinoFinal,
        customerName: e.name,
        message: cuerpo,
        type: channel,
        subject: subject || undefined,
      });

      if (result === null) {
        fallidos++;
        detalles.push({ id: e.id, name: e.name, ok: false, detalle: `Error al enviar ${channel} a ${destinoFinal}` });
      } else {
        enviados++;
        detalles.push({ id: e.id, name: e.name, ok: true, detalle: `${channel} enviado a ${destinoFinal}` });
      }

      // Pausa corta entre envíos para no saturar las APIs de mensajería
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS_ENTRE_ENVIOS));
    }

    return NextResponse.json({
      total: entities.length,
      enviados,
      fallidos,
      sin_destino: sinDestino,
      detalles,
    });
  } catch (e: any) {
    console.error("Bulk contact error:", e);
    return NextResponse.json({ message: e.message || "Error interno." }, { status: 500 });
  }
}
