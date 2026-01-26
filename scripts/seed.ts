
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // --- Create MASSIVA_EXTRA User ---
  const extraPassword = await hash('extra-password-123', 10);
  const massivaExtra = await prisma.user.upsert({
    where: { email: 'extra@massivamovil.com' },
    update: {},
    create: {
      email: 'extra@massivamovil.com',
      password_hash: extraPassword,
      nombre: 'Extra',
      apellido: 'User',
      telefono_celular: '0412-555-1122',
      cargo: 'Staff Administrativo',
      role: UserRole.MASSIVA_EXTRA,
      is_active: true,
    },
  });
  console.log('Created MASSIVA_EXTRA user:', massivaExtra);

  // --- Create CLIENTE User ---
  const clientePassword = await hash('cliente-password-456', 10);
  const cliente = await prisma.user.upsert({
    where: { email: 'cliente@example.com' },
    update: {},
    create: {
      email: 'cliente@example.com',
      password_hash: clientePassword,
      nombre: 'Cliente',
      apellido: 'Ejemplo',
      telefono_celular: '0424-777-8899',
      cargo: 'Usuario Final',
      role: UserRole.CLIENTE,
      is_active: true,
    },
  });
  console.log('Created CLIENTE user:', cliente);
  
  // --- Create corresponding CLIENTE Customer ---
  const clienteCustomer = await prisma.customer.upsert({
    where: { doc_number: 'V-12345678-9' },
    update: {},
    create: {
      user_id: cliente.id,
      name: 'Cliente Ejemplo C.A.',
      doc_number: 'V-12345678-9',
      type: 'PERSONA',
      email: 'cliente@example.com',
      telefono_celular: '0424-777-8899',
    },
  });
  console.log('Created CLIENTE customer:', clienteCustomer);


  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
