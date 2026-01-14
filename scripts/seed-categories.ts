// massivamovilerp/scripts/seed-categories.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Usamos la DATABASE_URL que debería ser la de conexión directa para este script
const connectionString = process.env.DATABASE_URL as string;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando la inserción de datos para la tabla Category...');

  const categoriesToSeed = [
    { name: 'Mensajería SMS', description: 'Servicios de envío masivo de mensajes SMS.' },
    { name: 'Mensajería WhatsApp', description: 'Servicios de envío masivo de mensajes a través de WhatsApp.' },
    { name: 'Planes de Comunicación', description: 'Paquetes y planes para estrategias de comunicación.' },
    { name: 'Herramientas de Marketing', description: 'Herramientas para campañas de marketing digital y automatización.' },
  ];

  for (const categoryData of categoriesToSeed) {
    try {
      const category = await prisma.category.upsert({
        where: { name: categoryData.name },
        update: {}, // No actualizamos nada si ya existe
        create: categoryData,
      });
      console.log(`✅ Categoría "${category.name}" insertada/actualizada con ID: ${category.id}`);
    } catch (error) {
      console.error(`❌ Error al insertar/actualizar la categoría "${categoryData.name}":`, error);
    }
  }

  console.log('Inserción de datos para Category completada.');
}

main()
  .catch((e) => {
    console.error('Error general en el script de seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });