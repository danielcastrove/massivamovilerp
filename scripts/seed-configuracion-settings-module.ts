import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('--- Registrando/Actualizando Módulo Configuración (Settings) ---');

  const moduleName = "Configuración (Settings)";
  const modulePath = "/dashboard/settings";
  const moduleIcon = "Settings";

  const existing = await prisma.modulo.findFirst({ where: { name: moduleName } });

  if (!existing) {
    await prisma.modulo.create({
      data: {
        name: moduleName,
        path: modulePath,
        icon: moduleIcon,
        description: "Configuración personal, cambio de contraseña y datos básicos del usuario.",
        tipouser: JSON.stringify(["MASSIVA_ADMIN", "MASSIVA_EXTRA", "CLIENTE"])
      }
    });
    console.log(`✅ Módulo "${moduleName}" creado exitosamente.`);
  } else {
    await prisma.modulo.update({
      where: { id: existing.id },
      data: {
        path: modulePath,
        icon: moduleIcon,
        description: "Configuración personal, cambio de contraseña y datos básicos del usuario.",
        tipouser: JSON.stringify(["MASSIVA_ADMIN", "MASSIVA_EXTRA", "CLIENTE"])
      }
    });
    console.log(`ℹ️ Módulo "${moduleName}" actualizado.`);
  }

  console.log('--- Proceso finalizado ---');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
