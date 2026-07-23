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
  console.log('--- Iniciando población de números de factura y control ---');

  const invoices = await prisma.invoice.findMany({
    orderBy: {
      created_at: 'asc',
    },
  });

  console.log(`Encontradas ${invoices.length} facturas para actualizar.`);

  let count = 1;
  // Iniciamos el número de control en 100001 para asegurar 6 dígitos
  let controlBase = 100000; 

  for (const invoice of invoices) {
    const nextInvoiceNum = count;
    const nextControlNum = controlBase + count;

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        invoice_number: nextInvoiceNum,
        control_number: nextControlNum,
      },
    });
    console.log(`Actualizada factura ${invoice.id}: Factura #${nextInvoiceNum}, Control #${nextControlNum}`);
    count++;
  }

  console.log('✅ Proceso de actualización completado.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la actualización:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
