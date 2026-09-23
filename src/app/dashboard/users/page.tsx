import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllowedModulePaths } from "@/lib/navigation";
import { UserRole } from "@prisma/client";
import UsersPageClient, { UsersPageData } from "@/components/users/UsersPageClient";

export const metadata: Metadata = {
  title: "Gestión de Usuarios | MassivaMovil ERP",
  description: "Listado, creación, edición y eliminación de usuarios del sistema.",
};

const MODULE_USERS = "/dashboard/users";

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const allowedPaths = await getAllowedModulePaths(session.user.id, session.user.role);
  const allowed =
    session.user.role === UserRole.MASSIVA_ADMIN ||
    (session.user.role === UserRole.MASSIVA_EXTRA && allowedPaths.includes(MODULE_USERS));

  if (!allowed) {
    redirect("/access-denied");
  }

  const [users, modulos, roles, customers] = await Promise.all([
    prisma.user.findMany({
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
    }),
    prisma.modulo.findMany({ orderBy: { name: "asc" } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({
      select: { id: true, name: true, doc_number: true, user_id: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const userModuleMatrix = await prisma.moduloToRole.findMany({
    where: { role_id: { in: users.map((u) => u.roles_id).filter((r): r is string => !!r) } },
    select: { role_id: true, module_id: true },
  });

  const data: UsersPageData = {
    users: users.map((u) => ({
      ...u,
      status: (["ACTIVE", "INACTIVE", "BLOCKED"].includes(u.status) ? u.status : "ACTIVE") as "ACTIVE" | "INACTIVE" | "BLOCKED",
      created_at: u.created_at.toISOString(),
    })),
    modulos: modulos.map((m) => ({
      id: m.id,
      name: m.name,
      path: m.path ?? "",
      icon: m.icon ?? null,
    })),
    roles: roles.map((r) => ({ id: r.id, name: r.name })),
    customers: customers.map((c) => ({ id: c.id, name: c.name, doc_number: c.doc_number, user_id: c.user_id })),
    userModuleMatrix,
    currentUserRole: session.user.role as UserRole,
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Gestión de Usuarios</h2>
          <p className="text-sm text-slate-500 italic">
            Crea, edita y elimina usuarios del sistema según sus permisos.
          </p>
        </div>
      </div>

      <UsersPageClient initialData={data} />
    </div>
  );
}