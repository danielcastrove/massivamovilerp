// massivamovilerp/scripts/seed-leads.ts
import { PrismaClient, LeadSource, LeadStatus, LeadType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Seeding Leads Data ---');

  // Find some products and price lists to associate with leads
  const products = await prisma.product.findMany({ take: 3 });
  const priceLists = await prisma.priceList.findMany({ take: 2 });

  const leadsData = [
    {
      nombre: 'Carlos',
      apellido: 'Rodriguez',
      email: 'carlos.rod@example.com',
      telefono: '+584121234567',
      procedencia: LeadSource.SITIO_WEB,
      status: LeadStatus.SIN_CONTACTAR,
      tipo_lead: LeadType.NORMAL,
      comentarios: 'Interesado en SMS masivo para su tienda de repuestos.',
      productId: products[0]?.id || null,
      priceListId: priceLists[0]?.id || null,
    },
    {
      nombre: 'Maria',
      apellido: 'Gomez',
      email: 'm.gomez@corporacion.com',
      telefono: '+584249876543',
      procedencia: LeadSource.LLAMADA,
      status: LeadStatus.LLAMADA_REALIZADA,
      tipo_lead: LeadType.VIP,
      comentarios: 'Cliente corporativo, requiere API de WhatsApp Business.',
      productId: products[1]?.id || null,
      priceListId: priceLists[1]?.id || null,
      fecha_llamada: new Date(),
    },
    {
      nombre: 'Luis',
      apellido: 'Martinez',
      email: 'luis.martinez@pyme.ve',
      telefono: '+584145554433',
      procedencia: LeadSource.WHATSAPP,
      status: LeadStatus.PROPUESTA_ENVIADA,
      tipo_lead: LeadType.NORMAL,
      comentarios: 'Solicitó presupuesto para 10.000 mensajes.',
      custom_product: 'Paquete Personalizado 10k SMS',
      priceListId: priceLists[0]?.id || null,
    },
    {
      nombre: 'Elena',
      apellido: 'Perez',
      email: 'elena@estetica.com',
      telefono: '+584120001122',
      procedencia: LeadSource.INSTAGRAM,
      status: LeadStatus.CONTACTO_REALIZADO,
      tipo_lead: LeadType.NORMAL,
      comentarios: 'Preguntó por precios via DM.',
    },
    {
      nombre: 'Roberto',
      apellido: 'Sánchez',
      email: 'roberto.s@freelance.com',
      telefono: '+584167778899',
      procedencia: LeadSource.RECOMENDACION,
      status: LeadStatus.ESPERANDO_APROBACION,
      tipo_lead: LeadType.NORMAL,
      comentarios: 'Recomendado por Cliente X. Esperando aprobación de presupuesto.',
      productId: products[2]?.id || null,
      priceListId: priceLists[0]?.id || null,
    }
  ];

  for (const lead of leadsData) {
    await prisma.lead.create({
      data: lead,
    });
  }

  console.log(`✅ Successfully seeded ${leadsData.length} leads.`);
}

main()
  .catch((e) => {
    console.error('Error seeding leads:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
