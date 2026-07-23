import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const modulos = await prisma.modulo.findMany();
  console.log('Modulos encontrados:', JSON.stringify(modulos, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
