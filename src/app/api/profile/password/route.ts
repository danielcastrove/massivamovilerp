import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations/profile";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, nombre: true, password_hash: true },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    if (!user.password_hash || user.password_hash.length < 10) {
      return NextResponse.json(
        { message: "No se puede verificar la contraseña actual." },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash).catch(() => false);
    if (!isValid) {
      return NextResponse.json(
        { message: "La contraseña actual es incorrecta." },
        { status: 401 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password_hash: passwordHash },
    });

    try {
      const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Contraseña actualizada</h1>
          </div>
          <div style="padding: 30px; line-height: 1.6;">
            <p>Hola <strong>${user.nombre || user.email}</strong>,</p>
            <p>Su contraseña en MassivaMovil ERP fue cambiada exitosamente.</p>
            <p><strong>Usuario:</strong> ${user.email}</p>
            <p style="margin-top: 20px;">Si no realizó este cambio, contacte al administrador inmediatamente.</p>
          </div>
        </div>
      `;
      await sendEmail({
        to: user.email,
        subject: "Contraseña actualizada - MassivaMovil ERP",
        html,
      });
    } catch (e) {
      console.error("Error enviando correo de confirmación de cambio de contraseña:", e);
    }

    return NextResponse.json({ message: "Contraseña actualizada correctamente." });
  } catch (e) {
    console.error("Error changing password:", e);
    return NextResponse.json({ message: "Error interno." }, { status: 500 });
  }
}
