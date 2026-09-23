import { prisma } from "../src/lib/db.ts";
import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const EMAIL = "susano@massivamovil.com";
const PASSWORD = "Susano777";
const ROLE_NAME = "Solo Rubro";

async function main() {
  // 1. Encontrar el módulo que en el dashboard deja ver "Clientes por Rubro"
  const modulos = await prisma.modulo.findMany();
  const rubroModule = modulos.find((m) => m.path === "/dashboard/customer" && m.name.includes("Clientes"));
  if (!rubroModule) {
    console.error("❌ No se encontró el módulo de Clientes (path /dashboard/customer). Abortando.");
    process.exit(1);
  }
  console.log(`✅ Módulo encontrado: "${rubroModule.name}" (${rubroModule.path})`);

  // 2. Crear (o reutilizar) un rol dedicado, garantizando que SOLO tenga ese módulo
  let role = await prisma.role.findUnique({ where: { name: ROLE_NAME } });
  if (!role) {
    role = await prisma.role.create({ data: { name: ROLE_NAME, is_massiva: true } });
    console.log(`✅ Rol creado: "${ROLE_NAME}"`);
  } else {
    console.log(`ℹ️ Rol existente: "${ROLE_NAME}"`);
  }

  // Borrar enlaces previos para que el rol quede únicamente con el módulo de Clientes
  const deleted = await prisma.moduloToRole.deleteMany({ where: { role_id: role.id } });
  if (deleted.count > 0) {
    console.log(`🗑️ Enlaces previos eliminados del rol: ${deleted.count}`);
  }

  await prisma.moduloToRole.upsert({
    where: { module_id_role_id: { module_id: rubroModule.id, role_id: role.id } },
    update: { assigned_by: "susano-script" },
    create: { module_id: rubroModule.id, role_id: role.id, assigned_by: "susano-script" },
  });
  console.log(`🔗 Rol "${ROLE_NAME}" enlazado SOLO al módulo "${rubroModule.name}"`);

  // 3. Crear o actualizar el usuario MASSIVA_EXTRA
  const passwordHash = await hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      role: UserRole.MASSIVA_EXTRA,
      roles_id: role.id,
      password_hash: passwordHash,
      is_active: true,
    },
    create: {
      email: EMAIL,
      password_hash: passwordHash,
      nombre: "Susano",
      apellido: "Rubro",
      cargo: "Consulta Rubros",
      role: UserRole.MASSIVA_EXTRA,
      roles_id: role.id,
      is_active: true,
    },
  });

  console.log(`✅ Usuario MASSIVA_EXTRA listo:`);
  console.log(`   Correo: ${EMAIL}`);
  console.log(`   Clave: ${PASSWORD}`);
  console.log(`   Rol: ${ROLE_NAME}`);
  console.log(`   id: ${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());