import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Actualizando Módulo de Cobranzas existente ---');

  // Buscamos el módulo por su nombre actual o ID
  const moduleName = "Cobranzas (Collections)";
  
  const updated = await prisma.modulo.update({
    where: { name: moduleName },
    data: {
      path: "/dashboard/cobranzas",
      icon: "DollarSign",
      // Aseguramos que los roles administrativos tengan acceso
      tipouser: JSON.stringify(["MASSIVA_ADMIN", "MASSIVA_EXTRA"])
    }
  });

  console.log(`✅ Módulo "${updated.name}" actualizado con ruta: ${updated.path} e icono: ${updated.icon}`);
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
