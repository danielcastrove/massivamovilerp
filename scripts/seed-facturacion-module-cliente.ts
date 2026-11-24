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

const MODULE_PATH = '/dashboard/facturacion';
const MODULE_NAME = 'Facturación (Invoicing)';
const MODULE_ICON = 'DollarSign';
const ROLES = ['MASSIVA_ADMIN', 'MASSIVA_EXTRA', 'CLIENTE'];

async function main() {
  console.log('--- Habilitando módulo de Facturación para CLIENTE ---');

  const existing = await prisma.modulo.findFirst({
    where: { path: MODULE_PATH },
  });

  if (!existing) {
    await prisma.modulo.create({
      data: {
        name: MODULE_NAME,
        path: MODULE_PATH,
        icon: MODULE_ICON,
        tipouser: JSON.stringify(ROLES),
      },
    });
    console.log(`✅ Módulo "${MODULE_NAME}" creado con roles: ${ROLES.join(', ')}`);
  } else {
    let current: string[] = [];
    try {
      const parsed = JSON.parse((existing.tipouser as string) || '[]');
      if (Array.isArray(parsed)) current = parsed.filter((r) => typeof r === 'string');
    } catch {
      current = [];
    }

    const merged = Array.from(new Set([...current, ...ROLES]));
    await prisma.modulo.update({
      where: { id: existing.id },
      data: { tipouser: JSON.stringify(merged) },
    });
    console.log(
      `ℹ️ Módulo "${existing.name}" (${MODULE_PATH}) actualizado: ${current.join(', ') || '(vacío)'} → ${merged.join(', ')}`
    );
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
