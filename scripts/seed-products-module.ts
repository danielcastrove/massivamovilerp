// massivamovilerp/scripts/seed-products-module.ts
import { prisma } from '../src/lib/db.ts';

async function main() {
  console.log('Seeding "Productos" module and linking to "Semi Administrador" role...');

  // 1. Create or find the "Productos" module
  const productsModule = await prisma.modulo.upsert({
    where: { name: 'Productos' },
    update: {
      path: '/dashboard/products',
      description: 'Gestión de productos y listas de precios.',
    },
    create: {
      name: 'Productos',
      path: '/dashboard/products',
      description: 'Gestión de productos y listas de precios.',
    },
  });
  console.log(`Module "${productsModule.name}" created or already exists.`);

  // 2. Find the "Semi Administrador" role
  const semiAdminRole = await prisma.role.findUnique({
    where: { name: 'Semi Administrador' },
  });

  if (!semiAdminRole) {
    console.error('Error: Role "Semi Administrador" not found. Please ensure this role is seeded first.');
    return;
  }
  console.log(`Found role: ${semiAdminRole.name}`);

  // 3. Link the "Productos" module to the "Semi Administrador" role
  await prisma.moduloToRole.upsert({
    where: {
      module_id_role_id: {
        module_id: productsModule.id,
        role_id: semiAdminRole.id,
      },
    },
    update: {},
    create: {
      module_id: productsModule.id,
      role_id: semiAdminRole.id,
      assigned_by: 'system-seed',
    },
  });

  console.log(`Successfully linked module "${productsModule.name}" to role "${semiAdminRole.name}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
