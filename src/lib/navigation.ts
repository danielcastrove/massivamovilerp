import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

const SETTINGS_MODULE = "/dashboard/settings";

export async function getAllowedModulePaths(userId: string, role: UserRole): Promise<string[]> {
  switch (role) {
    case UserRole.MASSIVA_ADMIN: {
      const modulos = await prisma.modulo.findMany({ select: { path: true } });
      const paths = modulos.map((m) => m.path ?? "/").filter(Boolean);
      if (!paths.includes(SETTINGS_MODULE)) paths.push(SETTINGS_MODULE);
      return paths;
    }

    case UserRole.MASSIVA_EXTRA: {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { modulos: { include: { modulo: true } } } } },
      });
      const modulos = user?.roles?.modulos.map((m2r) => m2r.modulo) ?? [];
      const paths = modulos.map((m) => m.path ?? "/").filter(Boolean);
      if (!paths.includes(SETTINGS_MODULE)) paths.push(SETTINGS_MODULE);
      return paths;
    }

    case UserRole.CLIENTE: {
      const modulos = await prisma.modulo.findMany();
      const paths = modulos
        .filter((m) => {
          try {
            const userTypes = JSON.parse((m.tipouser as string) || "[]");
            return Array.isArray(userTypes) && userTypes.includes(UserRole.CLIENTE);
          } catch {
            return false;
          }
        })
        .map((m) => m.path ?? "/")
        .filter(Boolean);
      if (!paths.includes(SETTINGS_MODULE)) paths.push(SETTINGS_MODULE);
      return paths;
    }

    default:
      return [SETTINGS_MODULE];
  }
}
