import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Registrando Módulo de Cobranzas ---');

  const moduleName = "Cobranza";
  const modulePath = "/dashboard/cobranzas";
  const moduleIcon = "DollarSign";

  const existing = await prisma.modulo.findUnique({
    where: { name: moduleName }
  });

  if (!existing) {
    await prisma.modulo.create({
      data: {
        name: moduleName,
        path: modulePath,
        icon: moduleIcon,
        tipouser: JSON.stringify(["MASSIVA_ADMIN", "MASSIVA_EXTRA"])
      }
    });
    console.log(`✅ Módulo "${moduleName}" creado exitosamente.`);
  } else {
    // Actualizamos por si acaso la ruta o el icono cambiaron
    await prisma.modulo.update({
      where: { name: moduleName },
      data: {
        path: modulePath,
        icon: moduleIcon,
        tipouser: JSON.stringify(["MASSIVA_ADMIN", "MASSIVA_EXTRA"])
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
