import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";
import {
  appendContactoExtra,
  formatPhoneParaEnvio,
  isValidEmail,
  isValidPhone,
  yaTieneContacto,
} from "@/lib/contacts";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { channel, message, subject, to, save_contact } = body;

    if (!channel || !["SMS", "WHATSAPP", "EMAIL"].includes(channel)) {
      return NextResponse.json({ message: "Canal inválido." }, { status: 400 });
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

    let toOverride = "";
    if (channel === "EMAIL" || channel === "SMS") {
      if (to !== undefined && to !== null) {
        if (typeof to !== "string" || to.trim().length === 0) {
          return NextResponse.json({ message: "Destinatario inválido." }, { status: 400 });
        }
        if (channel === "EMAIL" && !isValidEmail(to)) {
          return NextResponse.json({ message: "El correo electrónico no es válido." }, { status: 400 });
        }
        if (channel === "SMS" && !isValidPhone(to)) {
          return NextResponse.json({ message: "El teléfono no es válido (7 a 15 dígitos)." }, { status: 400 });
        }
        toOverride = to.trim();
      }
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        name: true,
        email: true,
        telefono_empresa: true,
        telefono_celular: true,
        persona_contacto_info: true,
        persona_cobranza_info: true,
        contactos_extra: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ message: "Cliente no encontrado." }, { status: 404 });
    }

    let recipient = "";

    if (toOverride) {
      recipient = toOverride;
    } else if (channel === "SMS" || channel === "WHATSAPP") {
      recipient = customer.telefono_empresa || customer.telefono_celular || "";
      if (!recipient) {
        const contactInfo = customer.persona_contacto_info as any;
        recipient = contactInfo?.telefono || contactInfo?.telefono_celular || "";
      }
      if (!recipient) {
        return NextResponse.json(
          { message: `El cliente no tiene número de teléfono registrado para ${channel}.` },
          { status: 400 }
        );
      }
    } else if (channel === "EMAIL") {
      recipient = customer.email || "";
      if (!recipient) {
        const contactInfo = customer.persona_contacto_info as any;
        recipient = contactInfo?.email || "";
      }
      if (!recipient) {
        return NextResponse.json(
          { message: "El cliente no tiene correo electrónico registrado." },
          { status: 400 }
        );
      }
    }

    if (channel === "SMS" || channel === "WHATSAPP") {
      recipient = formatPhoneParaEnvio(recipient);
    }

    const result = await sendNotification({
      to: recipient,
      customerName: customer.name,
      message: channel === "EMAIL" ? `<p>${message.replace(/\n/g, "<br/>")}</p>` : message,
      type: channel as "SMS" | "WHATSAPP" | "EMAIL",
      subject: subject || undefined,
    });

    if (result === null) {
      return NextResponse.json(
        { message: `Error al enviar ${channel}. Verifique la configuración de la API.` },
        { status: 500 }
      );
    }

    let contactoGuardado = false;
    if ((channel === "EMAIL" || channel === "SMS") && save_contact === true && toOverride) {
      const tipo = channel === "EMAIL" ? ("EMAIL" as const) : ("PHONE" as const);
      const esNuevo = !yaTieneContacto(customer.contactos_extra, tipo, toOverride, [
        customer.email,
        customer.telefono_empresa,
        customer.telefono_celular,
      ]);
      if (esNuevo) {
        const nuevos = appendContactoExtra(customer.contactos_extra, tipo, toOverride);
        await prisma.customer.update({
          where: { id },
          data: { contactos_extra: nuevos as unknown as Prisma.InputJsonValue },
        });
        contactoGuardado = true;
      }
    }

    return NextResponse.json({
      message: `${channel} enviado exitosamente a ${recipient}`,
      recipient,
      contacto_guardado: contactoGuardado,
    });
  } catch (e: any) {
    console.error("Contact error:", e);
    return NextResponse.json({ message: e.message || "Error interno." }, { status: 500 });
  }
}
