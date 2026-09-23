import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validations/forgot-password";

function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    pw += chars[bytes[i] % chars.length];
  }
  return pw;
}

function buildEmailHtml(tempPassword: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #0891b2; color: white; padding: 16px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 20px;">MassivaMovil ERP</h1>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1e293b; font-size: 18px; margin-top 0;">Contraseña Temporal</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Se ha generado una contraseña temporal para tu cuenta. Úsala para iniciar sesión.
        </p>
        <div style="background: white; border: 2px dashed #0891b2; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">Tu contraseña temporal:</p>
          <p style="color: #0891b2; font-size: 24px; font-weight: bold; font-family: monospace; margin: 0; letter-spacing: 2px;">${tempPassword}</p>
        </div>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="color: #92400e; font-size: 13px; margin: 0;">
            <strong>IMPORTANTE:</strong> Esta contraseña expira en <strong>1 hora</strong>. Si no la usas a tiempo, deberás solicitar una nueva.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
          Si no solicitaste esta contraseña, puedes ignorar este correo.
        </p>
      </div>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Correo inválido." },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, is_active: true, status: true },
    });

    if (user && user.is_active && user.status === "ACTIVE") {
      const tempPassword = generateTemporaryPassword();
      const tempPasswordHash = await hash(tempPassword, 10);
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          temp_password_hash: tempPasswordHash,
          temp_password_expires: expires,
        },
      });

      const html = buildEmailHtml(tempPassword);
      await sendEmail({
        to: user.email,
        subject: "Tu contraseña temporal - MassivaMovil ERP",
        html,
      });
    }

    return NextResponse.json({
      message: "Si la cuenta existe, recibirás un correo con una contraseña temporal.",
    });
  } catch (error) {
    console.error("[FORGOT_PASSWORD]", error);
    return NextResponse.json(
      { message: "Error al procesar la solicitud." },
      { status: 500 }
    );
  }
}
