import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { aplicarFirmaWhatsApp, LIMITE_WHATSAPP } from "@/lib/whatsapp-firma";
import { buildBrandEmail, emailMessageToHtml } from "@/lib/email-templates";
import { formatPhoneParaEnvio } from "@/lib/contacts";

// Destino del soporte MassivaMovil. Configurable por env vars (con fallback
// a los valores duros por si el entorno no las define).
const SUPPORT_PHONE = process.env.SUPPORT_CONTACT_PHONE || "04142768598";
const SUPPORT_EMAIL = process.env.SUPPORT_CONTACT_EMAIL || "josedelgadoyepez@gmail.com";

/**
 * Detecta fallos de la API de SMS/WhatsApp: sendNotification devuelve el
 * objeto de error (no null) cuando la API rechaza el envío.
 */
function envioFallido(result: unknown, channel: "SMS" | "WHATSAPP"): boolean {
  if (result === null || result === undefined) return true;
  if (typeof result !== "object") return false;
  const r = result as { error?: unknown; statusCode?: unknown; status?: unknown };
  if (r.error || r.statusCode) return true;
  if (channel === "SMS") {
    return r.status === undefined || Number(r.status) <= 0;
  }
  return Number(r.status) !== 200;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { channel, message, subject, invoiceNumber, customerName, customerDoc } = body;

    if (!channel || !["SMS", "WHATSAPP", "EMAIL"].includes(channel)) {
      return NextResponse.json({ message: "Canal inválido." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ message: "El mensaje es requerido." }, { status: 400 });
    }

    if (channel === "EMAIL" && (!subject || typeof subject !== "string" || subject.trim().length === 0)) {
      return NextResponse.json({ message: "El asunto es requerido para email." }, { status: 400 });
    }

    // Identidad del remitente: resolverla del servidor cuando esté vinculada
    // a un Customer (fuente de verdad); el body solo sirve de respaldo.
    const customer = await prisma.customer.findUnique({
      where: { user_id: session.user.id },
      select: { name: true, doc_number: true },
    });

    const nombre =
      customer?.name ||
      (typeof customerName === "string" && customerName.trim() ? customerName.trim() : "Usuario ERP");
    const doc =
      customer?.doc_number ||
      (typeof customerDoc === "string" && customerDoc.trim() ? customerDoc.trim() : "");
    const nro =
      typeof invoiceNumber === "string" || typeof invoiceNumber === "number"
        ? String(invoiceNumber).replace(/\D/g, "").padStart(6, "0")
        : "";

    const contexto = [
      "Contacto desde el portal de facturación (MassivaMovil ERP)",
      `Cliente: ${nombre}${doc ? ` (${doc})` : ""}`,
      nro ? `Factura: #${nro}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    // Contexto compacto para SMS: el límite es 160 caracteres y el mensaje
    // del cliente debe caber. La factura identifica al remitente.
    const contextoSms = `${nombre}${nro ? ` - Fact. Nro ${nro}` : ""}`;

    let to: string;
    let payload: string;
    let finalSubject: string | undefined;

    if (channel === "EMAIL") {
      to = SUPPORT_EMAIL;
      finalSubject = subject.trim();
      payload = buildBrandEmail({
        type: "general",
        bodyHtml: `<p style="margin:0 0 12px;color:#6b7280;font-size:13px;">${contexto}</p>${emailMessageToHtml(message.trim())}`,
      });
    } else {
      // La API de SMS exige el formato internacional (+58...); con el 0
      // inicial el envío falla. WhatsApp también normaliza a 58.
      to = formatPhoneParaEnvio(SUPPORT_PHONE);
      payload =
        channel === "SMS"
          ? `${contextoSms}\n${message.trim()}`
          : `${contexto}\n\n${message.trim()}`;
      if (channel === "SMS" && payload.length > 160) {
        return NextResponse.json(
          { message: "El SMS no puede exceder 160 caracteres (incluyendo el contexto del remitente)." },
          { status: 400 }
        );
      }
      if (channel === "WHATSAPP" && aplicarFirmaWhatsApp(payload).length > LIMITE_WHATSAPP) {
        return NextResponse.json({ message: "El mensaje de WhatsApp no puede exceder 1000 caracteres." }, { status: 400 });
      }
    }

    const result = await sendNotification({
      to,
      customerName: nombre,
      message: payload,
      type: channel,
      subject: finalSubject,
    });

    if (result === null || (channel !== "EMAIL" && envioFallido(result, channel))) {
      console.error(`[SUPPORT_CONTACT] Envío fallido (${channel} → ${to}):`, result);
      return NextResponse.json(
        { message: `La API de ${channel} rechazó el envío al equipo de soporte. Intente de nuevo o use otro canal.` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `${channel} enviado al equipo de soporte`,
      channel,
    });
  } catch (e) {
    console.error("Support contact error:", e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Error interno." },
      { status: 500 }
    );
  }
}
