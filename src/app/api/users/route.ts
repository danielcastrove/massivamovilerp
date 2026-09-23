import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getAllowedModulePaths } from "@/lib/navigation";
import { createUserSchema } from "@/lib/validations/user";
import { sendEmail } from "@/lib/email";

const MODULE_USERS = "/dashboard/users";

function generateRandomPassword(length = 10) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

async function canManageUsers(sessionRole: UserRole, allowedPaths: string[]): Promise<boolean> {
  if (sessionRole === UserRole.MASSIVA_ADMIN) return true;
  if (sessionRole === UserRole.MASSIVA_EXTRA) return allowedPaths.includes(MODULE_USERS);
  return false;
}

async function requireUserAccess() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }), session };
  }
  const allowedPaths = await getAllowedModulePaths(session.user.id, session.user.role);
  if (!(await canManageUsers(session.user.role, allowedPaths))) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }), session };
  }
  return { error: null, session };
}

export async function GET() {
  try {
    const { error } = await requireUserAccess();
    if (error) return error;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        telefono_celular: true,
        cargo: true,
        role: true,
        is_active: true,
        status: true,
        created_at: true,
        roles_id: true,
        roles: { select: { id: true, name: true } },
        Customer: { select: { id: true, name: true, doc_number: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (e) {
    console.error("Error listing users:", e);
    return NextResponse.json({ message: "Error interno." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { error, session } = await requireUserAccess();
    if (error) return error;

    const body = await req.json();
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = validation.data;

    // Un MASSIVA_EXTRA nunca puede crear administradores.
    if (session!.user.role !== UserRole.MASSIVA_ADMIN && data.role === UserRole.MASSIVA_ADMIN) {
      return NextResponse.json({ message: "Solo un administrador puede crear usuarios administradores." }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let roles_id: string | null = null;

      // Rol dedicado 1:1 para MASSIVA_EXTRA
      if (data.role === UserRole.MASSIVA_EXTRA) {
        // Buscar Role por nombre (rol_name)
        if (data.rol_name) {
          const existingRole = await tx.role.findFirst({ where: { name: data.rol_name } });
          if (existingRole) {
            roles_id = existingRole.id;
          } else {
            // Si no existe, crear uno nuevo con ese nombre
            const newRole = await tx.role.create({
              data: { name: data.rol_name, is_massiva: true },
            });
            roles_id = newRole.id;
          }
        } else {
          // Sin nombre de rol, crear uno con el email
          const newRole = await tx.role.create({
            data: { name: data.email, is_massiva: true },
          });
          roles_id = newRole.id;
        }
        if (data.modules.length > 0 && roles_id) {
          await tx.moduloToRole.createMany({
            data: data.modules.map((moduleId) => ({
              module_id: moduleId,
              role_id: roles_id!,
              assigned_by: `user.${session!.user.id}`,
            })),
          });
        }
      }

      const plainPassword = data.resetPassword || generateRandomPassword();
      const passwordHash = data.resetPassword ? await bcrypt.hash(data.resetPassword, 10) : await bcrypt.hash(plainPassword, 10);

      const user = await tx.user.create({
        data: {
          email: data.email,
          password_hash: passwordHash,
          nombre: data.nombre,
          apellido: data.apellido || null,
          telefono_celular: data.telefono_celular || null,
          cargo: data.cargo || null,
          role: data.role,
          is_active: data.is_active,
          status: data.status as any,
          roles_id,
        },
      });

      // Enlazar customer 1:1 para CLIENTE
      if (data.role === UserRole.CLIENTE && data.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (!customer) {
          return { error: true, status: 400, message: "Cliente no encontrado." };
        }
        if (customer.user_id && customer.user_id !== user.id) {
          return { error: true, status: 409, message: "El cliente seleccionado ya está vinculado a otro usuario." };
        }
        await tx.customer.update({
          where: { id: data.customerId },
          data: { user_id: user.id },
        });
      }

      return { error: false, user, passwordSent: !data.resetPassword, plainPassword };
    });

    if (result.error) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    if (result.passwordSent) {
      try {
        const html = welcomeEmailHtml(result.user.nombre || "Usuario", result.user.email, result.plainPassword);
        await sendEmail({ to: result.user.email, subject: "Credenciales de acceso - MassivaMovil ERP", html });
        console.log(`Correo de bienvenida enviado a ${result.user.email}`);
      } catch (emailError) {
        console.error("Error al enviar el correo:", emailError);
      }
    }

    return NextResponse.json({ user: result.user }, { status: 201 });
  } catch (e) {
    console.error("Error creating user:", e);
    const err = e as { code?: string; message?: string };
    if (err.code === "P2002") {
      return NextResponse.json({ message: "Ya existe un usuario con ese correo." }, { status: 409 });
    }
    return NextResponse.json({ message: err.message || "Error interno." }, { status: 500 });
  }
}

function welcomeEmailHtml(nombre: string, email: string, plainPassword: string): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #6d28d9; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Bienvenido a MassivaMovil ERP</h1>
      </div>
      <div style="padding: 30px; line-height: 1.6;">
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Se ha creado una cuenta para usted en nuestra plataforma de gestión.</p>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #6d28d9; margin: 20px 0;">
          <p style="margin-top: 0;"><strong>Sus credenciales de acceso:</strong></p>
          <p style="margin-bottom: 5px;"><strong>URL:</strong> <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://massivamovilerp.vercel.app"}" style="color: #6d28d9;">Acceder al Portal</a></p>
          <p style="margin-bottom: 5px;"><strong>Usuario:</strong> ${email}</p>
          <p style="margin-bottom: 10px;"><strong>Contraseña Temporal:</strong> <span style="font-family: monospace; background: #eee; padding: 2px 5px; border-radius: 3px;">${plainPassword}</span></p>
        </div>
        <p style="color: #dc2626; font-weight: bold;">⚠️ Esta es su clave temporal. Por seguridad, cámbiela lo antes posible.</p>
        <p style="margin-top: 30px;">Si tiene alguna duda, por favor contáctenos.</p>
        <p>Saludos,<br>El equipo de MassivaMovil.com</p>
      </div>
    </div>
  `;
}