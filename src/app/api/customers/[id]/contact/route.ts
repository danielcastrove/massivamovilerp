import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

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
    const { channel, message, subject } = body;

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

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        name: true,
        email: true,
        telefono_empresa: true,
        telefono_celular: true,
        persona_contacto_info: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ message: "Cliente no encontrado." }, { status: 404 });
    }

    let recipient = "";

    if (channel === "SMS" || channel === "WHATSAPP") {
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
    }

    if (channel === "EMAIL") {
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

    return NextResponse.json({
      message: `${channel} enviado exitosamente a ${recipient}`,
      recipient,
    });
  } catch (e: any) {
    console.error("Contact error:", e);
    return NextResponse.json({ message: e.message || "Error interno." }, { status: 500 });
  }
}
