import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsPageClient, { SettingsPageData } from "@/components/settings/SettingsPageClient";

export const metadata: Metadata = {
  title: "Configuración | MassivaMovil ERP",
  description: "Configuración personal, cambio de contraseña y datos básicos del usuario.",
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      nombre: true,
      apellido: true,
      telefono_celular: true,
      cargo: true,
      role: true,
      is_active: true,
      created_at: true,
      roles: { select: { id: true, name: true } },
      Customer: { select: { id: true, name: true, doc_number: true } },
    },
  });

  if (!user) {
    redirect("/auth/login");
  }

  const data: SettingsPageData = {
    user: {
      ...user,
      created_at: user.created_at.toISOString(),
    },
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
          Configuración
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Gestiona tu perfil y contraseña
        </p>
      </div>
      <SettingsPageClient initialData={data} />
    </div>
  );
}
