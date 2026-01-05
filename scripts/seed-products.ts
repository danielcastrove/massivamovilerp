// massivamovilerp/scripts/seed-products.ts
import { PrismaClient, ProductType, BillingCycle } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding products...');

  // Create two price lists (direct creation for seeding simplicity)
  const retailList = await prisma.priceList.create({
    data: {
      name: 'Retail',
    },
  });

  const wholesaleList = await prisma.priceList.create({
    data: {
      name: 'Mayorista',
    },
  });

  console.log('Price lists created/verified.');

  // Create five products
  const products = [
    {
      name: 'Servicio de SMS Básico',
      type: ProductType.RECURRENT,
      billing_cycle: BillingCycle.MONTHLY,
      prices: {
        [retailList.id]: 10,
        [wholesaleList.id]: 8,
      },
    },
    {
      name: 'Servicio de SMS Premium',
      type: ProductType.RECURRENT,
      billing_cycle: BillingCycle.MONTHLY,
      prices: {
        [retailList.id]: 20,
        [wholesaleList.id]: 15,
      },
    },
    {
      name: 'Paquete de 1000 SMS',
      type: ProductType.ONE_TIME,
      billing_cycle: null,
      prices: {
        [retailList.id]: 5,
        [wholesaleList.id]: 4,
      },
    },
    {
      name: 'API de WhatsApp Business',
      type: ProductType.RECURRENT,
      billing_cycle: BillingCycle.BIMONTHLY,
      prices: {
        [retailList.id]: 50,
        [wholesaleList.id]: 40,
      },
    },
    {
      name: 'Soporte Técnico Prioritario',
      type: ProductType.ONE_TIME,
      billing_cycle: null,
      prices: {
        [retailList.id]: 100,
        [wholesaleList.id]: 80,
      },
    },
  ];

  for (const productData of products) {
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        type: productData.type,
        billing_cycle: productData.billing_cycle,
      },
    });

    console.log(`Created product: ${product.name}`);

    // Create product prices
    for (const priceListId in productData.prices) {
      await prisma.productPrice.create({
        data: {
          product_id: product.id,
          price_list_id: priceListId,
          price_usd: productData.prices[priceListId],
        },
      });
      console.log(`  - Linked to price list ${priceListId} with price ${productData.prices[priceListId]}`);
    }
  }

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
