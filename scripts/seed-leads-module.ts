
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
  console.log('--- Registrando Módulo de Leads ---');

  // 1. Crear el módulo en la tabla Modulo
  const leadsModule = await prisma.modulo.upsert({
    where: { name: 'Leads' },
    update: {
      path: '/dashboard/leads',
      icon: 'UserPlus',
      description: 'Gestión de prospectos y embudo de ventas'
    },
    create: {
      name: 'Leads',
      path: '/dashboard/leads',
      icon: 'UserPlus',
      description: 'Gestión de prospectos y embudo de ventas'
    },
  });

  console.log(`Módulo "${leadsModule.name}" registrado con éxito.`);

  // 2. Asociar el módulo al rol de Administrador (MASSIVA_ADMIN)
  const adminRole = await prisma.role.findUnique({
    where: { name: 'MASSIVA_ADMIN' }
  });

  if (adminRole) {
    await prisma.moduloToRole.upsert({
      where: {
        module_id_role_id: {
          module_id: leadsModule.id,
          role_id: adminRole.id
        }
      },
      update: { assigned_by: 'system' },
      create: {
        module_id: leadsModule.id,
        role_id: adminRole.id,
        assigned_by: 'system'
      }
    });
    console.log(`Módulo de Leads asignado al rol ${adminRole.name}.`);
  }

  // 3. Asociar el módulo al rol de Semi-Administrador (SEMI-ADMINISTRADOR)
  const semiAdminRole = await prisma.role.findUnique({
    where: { name: 'SEMI-ADMINISTRADOR' }
  });

  if (semiAdminRole) {
    await prisma.moduloToRole.upsert({
      where: {
        module_id_role_id: {
          module_id: leadsModule.id,
          role_id: semiAdminRole.id
        }
      },
      update: { assigned_by: 'system' },
      create: {
        module_id: leadsModule.id,
        role_id: semiAdminRole.id,
        assigned_by: 'system'
      }
    });
    console.log(`Módulo de Leads asignado al rol ${semiAdminRole.name}.`);
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
