import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getAllowedModulePaths } from "@/lib/navigation";
import { updateUserSchema } from "@/lib/validations/user";
import { sendEmail } from "@/lib/email";

const MODULE_USERS = "/dashboard/users";

async function requireUserAccess() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }), session };
  }
  const allowedPaths = await getAllowedModulePaths(session.user.id, session.user.role);
  const allowed =
    session.user.role === UserRole.MASSIVA_ADMIN ||
    (session.user.role === UserRole.MASSIVA_EXTRA && allowedPaths.includes(MODULE_USERS));
  if (!allowed) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }), session };
  }
  return { error: null, session };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, session } = await requireUserAccess();
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const data = validation.data;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    const actor = session!.user;

    // Solo un admin puede modificar a otro admin.
    if (target.role === UserRole.MASSIVA_ADMIN && actor.role !== UserRole.MASSIVA_ADMIN) {
      return NextResponse.json({ message: "Solo un administrador puede modificar usuarios administradores." }, { status: 403 });
    }

    // Un extra no puede ascender a nadie a admin ni crear admins de paso.
    if (actor.role !== UserRole.MASSIVA_ADMIN && data.role === UserRole.MASSIVA_ADMIN) {
      return NextResponse.json({ message: "Solo un administrador puede otorgar rol de administrador." }, { status: 403 });
    }

    type UpdateResult =
      | { error: true; status: number; message: string }
      | {
          error: false;
          user: { id: string; email: string; nombre: string | null; role: UserRole };
          passwordResetInfo: { reset: boolean; plainPassword?: string };
        };

    const result = await prisma.$transaction(async (tx): Promise<UpdateResult> => {
      let roles_id = data.role !== undefined ? (data.role === UserRole.MASSIVA_EXTRA ? target.roles_id : null) : target.roles_id;

      // Reasignar rol dedicado 1:1 al pasar a EXTRA
      if (data.role === UserRole.MASSIVA_EXTRA && target.role !== UserRole.MASSIVA_EXTRA) {
        if (data.rol_name) {
          const existingRole = await tx.role.findFirst({ where: { name: data.rol_name } });
          if (existingRole) {
            roles_id = existingRole.id;
          } else {
            const newRole = await tx.role.create({ data: { name: data.rol_name, is_massiva: true } });
            roles_id = newRole.id;
          }
        } else {
          const newRole = await tx.role.create({ data: { name: target.email, is_massiva: true } });
          roles_id = newRole.id;
        }
        if (data.modules && data.modules.length > 0 && roles_id) {
          await tx.moduloToRole.createMany({
            data: data.modules.map((moduleId) => ({
              module_id: moduleId,
              role_id: roles_id!,
              assigned_by: `user.${actor.id}`,
            })),
          });
        }
      }

      // Actualizar nombre del rol si se provee rol_name (EXTRA existente)
      if (data.role === UserRole.MASSIVA_EXTRA && target.role === UserRole.MASSIVA_EXTRA && data.rol_name && target.roles_id) {
        await tx.role.update({ where: { id: target.roles_id }, data: { name: data.rol_name } });
      }

      // Ajuste de módulos de un EXTRA existente en su rol dedicado
      if (data.role === UserRole.MASSIVA_EXTRA && target.role === UserRole.MASSIVA_EXTRA && data.modules) {
        const roleUsersCount = await tx.user.count({ where: { roles_id: target.roles_id } });
        let roleId = target.roles_id as string;

        // Si el rol es compartido, clonarlo a un rol dedicado
        if (roleUsersCount > 1) {
          const sharedRole = await tx.role.findUnique({ where: { id: roleId }, include: { modulos: true } });
          const newRole = await tx.role.create({
            data: {
              name: target.email,
              is_massiva: sharedRole?.is_massiva ?? true,
            },
          });
          if (sharedRole) {
            await tx.moduloToRole.createMany({
              data: sharedRole.modulos.map((m2r) => ({
                module_id: m2r.module_id,
                role_id: newRole.id,
                assigned_by: `user.${actor.id}`,
              })),
            });
          }
          roleId = newRole.id;
          roles_id = newRole.id;
          await tx.user.update({ where: { id: target.id }, data: { roles_id: newRole.id } });
        }

        await tx.moduloToRole.deleteMany({ where: { role_id: roleId } });
        if (data.modules.length > 0) {
          await tx.moduloToRole.createMany({
            data: data.modules.map((moduleId) => ({
              module_id: moduleId,
              role_id: roleId,
              assigned_by: `user.${actor.id}`,
            })),
          });
        }
      }

      let passwordResetInfo: { reset: boolean; plainPassword?: string } = { reset: false };
      if (data.resetPassword) {
        const passwordHash = await bcrypt.hash(data.resetPassword, 10);
        await tx.user.update({ where: { id }, data: { password_hash: passwordHash } });
        passwordResetInfo = { reset: true };
      }

      const user = await tx.user.update({
        where: { id },
        data: {
          email: data.email ?? target.email,
          nombre: data.nombre ?? target.nombre,
          apellido: data.apellido !== undefined ? (data.apellido || null) : target.apellido,
          telefono_celular: data.telefono_celular !== undefined ? (data.telefono_celular || null) : target.telefono_celular,
          cargo: data.cargo !== undefined ? (data.cargo || null) : target.cargo,
          role: data.role ?? target.role,
          is_active: data.is_active ?? target.is_active,
          status: (data.status as any) ?? (target as any).status,
          roles_id,
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          role: true,
        },
      });

      // Enlazar/cambiar customer 1:1 para CLIENTE
      if (data.role === UserRole.CLIENTE && data.customerId) {
        const oldCustomer = await tx.customer.findFirst({ where: { user_id: id } });
        if (oldCustomer && oldCustomer.id !== data.customerId) {
          await tx.customer.update({ where: { id: oldCustomer.id }, data: { user_id: null } });
        }
        const newCustomer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (!newCustomer) {
          return { error: true, status: 400, message: "Cliente no encontrado." };
        }
        if (newCustomer.user_id && newCustomer.user_id !== id) {
          return { error: true, status: 409, message: "El cliente seleccionado ya está vinculado a otro usuario." };
        }
        await tx.customer.update({ where: { id: data.customerId }, data: { user_id: id } });
      }

      // Si el usuario pasa de CLIENTE a otro rol, desvincular su customer
      if (data.role && data.role !== UserRole.CLIENTE) {
        await tx.customer.updateMany({ where: { user_id: id }, data: { user_id: null } });
      }

      return { error: false, user, passwordResetInfo };
    });

    if (result.error) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    if (result.passwordResetInfo.reset) {
      try {
        const html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #6d28d9; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Contraseña restablecida</h1>
            </div>
            <div style="padding: 30px; line-height: 1.6;">
              <p>Hola <strong>${result.user.nombre ?? result.user.email}</strong>,</p>
              <p>Su contraseña en MassivaMovil ERP fue restablecida por un administrador.</p>
              <p><strong>Usuario:</strong> ${result.user.email}</p>
              <p style="margin-top: 20px;">Si tiene alguna duda, por favor contáctenos.</p>
            </div>
          </div>
        `;
        await sendEmail({ to: result.user.email, subject: "Contraseña restablecida - MassivaMovil ERP", html });
      } catch (e) {
        console.error("Error enviando correo de reset:", e);
      }
    }

    return NextResponse.json({ user: result.user }, { status: 200 });
  } catch (e) {
    console.error("Error updating user:", e);
    const err = e as { code?: string; message?: string };
    if (err.code === "P2002") {
      return NextResponse.json({ message: "Ya existe un usuario con ese correo." }, { status: 409 });
    }
    return NextResponse.json({ message: err.message || "Error interno." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, session } = await requireUserAccess();
    if (error) return error;

    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    const actor = session!.user;
    if (target.role === UserRole.MASSIVA_ADMIN && actor.role !== UserRole.MASSIVA_ADMIN) {
      return NextResponse.json({ message: "Solo un administrador puede eliminar usuarios administradores." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // Desvincular customer asociado
      await tx.customer.updateMany({ where: { user_id: id }, data: { user_id: null } });
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Usuario eliminado correctamente" }, { status: 200 });
  } catch (e) {
    console.error("Error deleting user:", e);
    return NextResponse.json({ message: (e as Error).message || "Error interno." }, { status: 500 });
  }
}