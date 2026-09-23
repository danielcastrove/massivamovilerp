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
  console.log('--- Iniciando creación de parámetros iniciales ---');

  const parametros = [
    { key: 'ULTIMO_NUMERO_FACTURA', value: '100000' },
    { key: 'ULTIMO_NUMERO_CONTROL', value: '100000' },
    { key: 'ULTIMO_NUMERO_RECIBO', value: '100000' },
    { key: 'ULTIMO_NUMERO_CONTROL_RECIBO', value: '100000' },
    { key: 'ULTIMO_NUMERO_RETENCION_IVA', value: '100000' },
    { key: 'ULTIMO_NUMERO_RETENCION_ISLR', value: '100000' },
  ];

  for (const p of parametros) {
    const existing = await prisma.parametro.findUnique({
      where: { key: p.key }
    });

    if (!existing) {
      await prisma.parametro.create({
        data: {
          key: p.key,
          value: p.value
        }
      });
      console.log(`✅ Creado parámetro: ${p.key}`);
    } else {
      console.log(`ℹ️ El parámetro ${p.key} ya existe.`);
    }
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
