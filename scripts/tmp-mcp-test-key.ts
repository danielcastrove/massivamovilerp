// Temporal: crea/elimina una API key de solo lectura para probar el endpoint MCP
// Uso: dotenv -e .env -- ts-node --transpile-only scripts/tmp-mcp-test-key.ts create
//      dotenv -e .env -- ts-node --transpile-only scripts/tmp-mcp-test-key.ts cleanup
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { createHash, randomBytes } from 'crypto';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const KEY_NAME = 'prueba-mcp-temporal';
const KEY_NAME_RESTRICTED = 'prueba-mcp-restringida';

const READ_ONLY_ENDPOINTS = [
  'GET:/api/customers/*',
  'GET:/api/invoices/*',
  'GET:/api/products/*',
  'GET:/api/leads/*',
  'GET:/api/payments/*',
  'GET:/api/productprices/*',
  'GET:/api/categories/*',
];

async function create() {
  const admin = await prisma.user.findFirst({
    where: { role: 'MASSIVA_ADMIN' },
    select: { id: true },
  });
  if (!admin) throw new Error('No hay usuario MASSIVA_ADMIN');

  const sk = `sk-${randomBytes(24).toString('hex')}`;
  const row = await prisma.apiKey.create({
    data: {
      name: KEY_NAME,
      key_hash: createHash('sha256').update(sk).digest('hex'),
      key_prefix: sk.slice(0, 14),
      description: 'Key temporal para smoke test MCP (solo lectura)',
      allowed_endpoints: READ_ONLY_ENDPOINTS,
      is_active: true,
      rate_limit: 60,
      created_by: admin.id,
    },
  });
  console.log(`CREATED id=${row.id}`);
  console.log(`KEY=${sk}`);
}

async function createRestricted() {
  const admin = await prisma.user.findFirst({
    where: { role: 'MASSIVA_ADMIN' },
    select: { id: true },
  });
  if (!admin) throw new Error('No hay usuario MASSIVA_ADMIN');

  const sk = `sk-${randomBytes(24).toString('hex')}`;
  const row = await prisma.apiKey.create({
    data: {
      name: KEY_NAME_RESTRICTED,
      key_hash: createHash('sha256').update(sk).digest('hex'),
      key_prefix: sk.slice(0, 14),
      description: 'Key temporal MCP restringida a clientes (allowlist test)',
      allowed_endpoints: ['GET:/api/customers/*'],
      is_active: true,
      rate_limit: 60,
      created_by: admin.id,
    },
  });
  console.log(`CREATED id=${row.id}`);
  console.log(`KEY=${sk}`);
}

async function cleanup() {
  const res = await prisma.apiKey.deleteMany({
    where: { name: { in: [KEY_NAME, KEY_NAME_RESTRICTED] } },
  });
  console.log(`Keys eliminadas: ${res.count}`);
}

async function main() {
  const mode = process.argv[2] || 'create';
  if (mode === 'create') await create();
  else if (mode === 'create-restricted') await createRestricted();
  else if (mode === 'cleanup') await cleanup();
  else throw new Error(`Modo desconocido: ${mode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
