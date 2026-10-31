// Temporal: crea/elimina una API key de prueba para validar test-apikeys.js
// Uso: dotenv -e .env -- ts-node --transpile-only scripts/tmp-test-apikey.ts create
//      dotenv -e .env -- ts-node --transpile-only scripts/tmp-test-apikey.ts cleanup
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { createHash, randomBytes } from 'crypto';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const KEY_NAME = 'prueba-test-script';
const KEY_NAME_2 = 'prueba-test-script-2';

const FULL_ENDPOINTS = [
  'GET:/api/products/*', 'POST:/api/products/*', 'PUT:/api/products/*', 'DELETE:/api/products/*',
  'GET:/api/customers/*', 'POST:/api/customers/*', 'PUT:/api/customers/*', 'DELETE:/api/customers/*',
  'GET:/api/invoices/*', 'POST:/api/invoices/*', 'PUT:/api/invoices/*', 'DELETE:/api/invoices/*',
  'GET:/api/productprices/*', 'POST:/api/productprices/*', 'DELETE:/api/productprices/*',
  'GET:/api/payments/*', 'POST:/api/payments/*', 'PUT:/api/payments/*', 'DELETE:/api/payments/*',
];

async function createKey(adminId: string, name: string, endpoints: string[]) {
  const sk = `sk-${randomBytes(24).toString('hex')}`;
  const keyHash = createHash('sha256').update(sk).digest('hex');

  const row = await prisma.apiKey.create({
    data: {
      name,
      key_hash: keyHash,
      key_prefix: sk.slice(0, 14),
      description: 'Key temporal para prueba de test-apikeys.js',
      allowed_endpoints: endpoints,
      is_active: true,
      created_by: adminId,
    },
  });
  console.log(`CREATED id=${row.id} name=${row.name}`);
  console.log(`KEY=${sk}`);
}

async function create() {
  const admin = await prisma.user.findFirst({
    where: { role: 'MASSIVA_ADMIN' },
    select: { id: true },
  });
  if (!admin) throw new Error('No hay usuario MASSIVA_ADMIN');

  if (process.argv[3] === 'full') {
    await createKey(admin.id, KEY_NAME_2, FULL_ENDPOINTS);
  } else if (process.argv[3] === 'leads') {
    await createKey(admin.id, 'prueba-audit-leads', [
      'GET:/api/leads/*',
      'POST:/api/leads/*',
      'PUT:/api/leads/*',
      'DELETE:/api/leads/*',
    ]);
  } else {
    await createKey(admin.id, KEY_NAME, [
      'GET:/api/leads/*',
      'POST:/api/leads/*',
      'PUT:/api/leads/*',
    ]);
  }
}

async function cleanup() {
  const key = await prisma.apiKey.deleteMany({
    where: { name: { in: [KEY_NAME, KEY_NAME_2, 'prueba-audit-leads'] } },
  });
  console.log(`Keys eliminadas: ${key.count}`);

  const leads = await prisma.lead.deleteMany({
    where: { nombre: 'APIKEY', apellido: { startsWith: 'TEST' } },
  });
  console.log(`Leads de prueba eliminados: ${leads.count}`);

  const customers = await prisma.customer.deleteMany({
    where: { name: { startsWith: 'Empresa APIKEY TEST' } },
  });
  console.log(`Clientes de prueba eliminados: ${customers.count}`);
}

async function cleanData() {
  const leads = await prisma.lead.deleteMany({
    where: { nombre: 'APIKEY', apellido: { startsWith: 'TEST' } },
  });
  console.log(`Leads de prueba eliminados: ${leads.count}`);

  const customers = await prisma.customer.deleteMany({
    where: { name: { startsWith: 'Empresa APIKEY TEST' } },
  });
  console.log(`Clientes de prueba eliminados: ${customers.count}`);

  const users = await prisma.user.deleteMany({
    where: { email: { startsWith: 'apikey-test-' } },
  });
  console.log(`Usuarios de prueba eliminados: ${users.count}`);

  const products = await prisma.product.deleteMany({
    where: { name: { startsWith: 'APIKEY-TEST' } },
  });
  console.log(`Productos de prueba eliminados: ${products.count}`);

  const payments = await prisma.payment.deleteMany({
    where: { reference: { startsWith: 'APIKEY-TEST' } },
  });
  console.log(`Pagos de prueba eliminados: ${payments.count}`);
}

async function verify() {
  const customers = await prisma.customer.count({
    where: { name: { startsWith: 'Empresa APIKEY TEST' } },
  });
  const users = await prisma.user.count({
    where: { email: { startsWith: 'apikey-test-' } },
  });
  const leads = await prisma.lead.count({
    where: { nombre: 'APIKEY', apellido: { startsWith: 'TEST' } },
  });
  const products = await prisma.product.count({
    where: { name: { startsWith: 'APIKEY-TEST' } },
  });
  const payments = await prisma.payment.count({
    where: { reference: { startsWith: 'APIKEY-TEST' } },
  });
  const keys = await prisma.apiKey.count({
    where: { name: { in: [KEY_NAME, KEY_NAME_2, 'prueba-audit-leads'] } },
  });
  console.log(JSON.stringify({ customers, users, leads, products, payments, keys }, null, 2));
}

async function main() {
  const mode = process.argv[2] || 'create';
  if (mode === 'create') await create();
  else if (mode === 'cleanup') await cleanup();
  else if (mode === 'clean-data') await cleanData();
  else if (mode === 'verify') await verify();
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
