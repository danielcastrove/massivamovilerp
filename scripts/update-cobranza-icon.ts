import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Actualizando Icono del Módulo de Cobranzas ---');

  const moduleName = "Cobranzas (Collections)";
  
  const updated = await prisma.modulo.update({
    where: { name: moduleName },
    data: {
      icon: "Coins"
    }
  });

  console.log(`✅ Módulo "${updated.name}" actualizado con icono: ${updated.icon}`);
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
