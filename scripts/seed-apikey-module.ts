import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Registrando Módulo de Gestor de API Key ---');

  const apiModule = await prisma.modulo.upsert({
    where: { name: 'Gestor de API Key' },
    update: {
      path: '/dashboard/api-keys',
      icon: 'Key',
      description: 'Gestión de API keys para acceso externo de páginas aliadas'
    },
    create: {
      name: 'Gestor de API Key',
      path: '/dashboard/api-keys',
      icon: 'Key',
      description: 'Gestión de API keys para acceso externo de páginas aliadas'
    },
  });

  console.log(`Módulo "${apiModule.name}" registrado con éxito.`);

  const adminRole = await prisma.role.findUnique({
    where: { name: 'MASSIVA_ADMIN' }
  });

  if (adminRole) {
    await prisma.moduloToRole.upsert({
      where: {
        module_id_role_id: {
          module_id: apiModule.id,
          role_id: adminRole.id
        }
      },
      update: { assigned_by: 'system' },
      create: {
        module_id: apiModule.id,
        role_id: adminRole.id,
        assigned_by: 'system'
      }
    });
    console.log(`Módulo asignado al rol ${adminRole.name}.`);
  }

  console.log('--- Proceso finalizado ---');
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
