// massivamovilerp/scripts/seed-full-customers.ts
import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el script de seeding...');

  // --- 1. Fetch Existing Resources ---
  console.log('Buscando recursos existentes (listas de precios y usuario)...');
  const retailPriceList = await prisma.priceList.findFirst({
    where: { name: 'Retail' },
  });

  const wholesalePriceList = await prisma.priceList.findFirst({
    where: { name: 'Mayorista' },
  });

  if (!retailPriceList || !wholesalePriceList) {
    console.error('Error: No se encontraron las listas de precios "Retail" y/o "Mayorista".');
    console.log('Por favor, asegúrese de que existan en la base de datos antes de ejecutar este script.');
    return;
  }
  const priceLists = [retailPriceList, wholesalePriceList];
  console.log('Listas de precios encontradas.');

  const existingUser = await prisma.user.findUnique({
    where: { email: 'josedelgadoyepz@gmail.com' },
  });

  if (!existingUser) {
    console.error('Error: No se encontró el usuario con email josedelgadoyepz@gmail.com.');
    return;
  }
  console.log('Usuario cliente existente encontrado.');

  // --- 2. Create Products and ProductPrices (if they don't exist) ---
  console.log('Creando productos y precios de productos...');
  let product1 = await prisma.product.findUnique({ where: { name: 'Plan SMS Básico' }});
  if (!product1) {
    product1 = await prisma.product.create({
      data: {
        name: 'Plan SMS Básico',
        type: 'RECURRENT',
        billing_cycle: 'BIMONTHLY',
      },
    });
    console.log(`Producto "Plan SMS Básico" creado.`);
  }

  let product2 = await prisma.product.findUnique({ where: { name: 'Plan WhatsApp Premium' }});
  if (!product2) {
    product2 = await prisma.product.create({
      data: {
        name: 'Plan WhatsApp Premium',
        type: 'RECURRENT',
        billing_cycle: 'MONTHLY',
      },
    });
     console.log(`Producto "Plan WhatsApp Premium" creado.`);
  }
  
  // Link products to price lists
  for (const list of priceLists) {
      await prisma.productPrice.upsert({
          where: { product_id_price_list_id: { product_id: product1.id, price_list_id: list.id }},
          update: {},
          create: {
              product_id: product1.id,
              price_list_id: list.id,
              price_usd: faker.number.int({ min: 10, max: 20 }),
          }
      });
      await prisma.productPrice.upsert({
          where: { product_id_price_list_id: { product_id: product2.id, price_list_id: list.id }},
          update: {},
          create: {
              product_id: product2.id,
              price_list_id: list.id,
              price_usd: faker.number.int({ min: 25, max: 40 }),
          }
      });
  }
  console.log('Productos y precios asociados a las listas existentes.');


  // --- 3. Create 4 Customers ---
  console.log('Iniciando creación de 4 clientes...');
  for (let i = 0; i < 4; i++) {
    console.log(`--- Creando cliente ${i + 1}/4 ---`);
    let userId;

    if (i === 0) {
      // Use existing user for the first customer
      userId = existingUser.id;
      console.log(`Cliente 1: Usando usuario existente ID: ${userId}`);
    } else {
      // Create new user for the other three
      const email = faker.internet.email();
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newUser = await prisma.user.create({
        data: {
          email: email,
          password_hash: hashedPassword,
          role: UserRole.CLIENTE,
          is_active: true,
        },
      });
      userId = newUser.id;
      console.log(`Cliente ${i+1}: Nuevo usuario creado con Email: ${email} y ID: ${userId}`);
    }
    
    const isJuridica = faker.datatype.boolean();
    const isAgenteRetencion = faker.datatype.boolean(0.3); // 30% chance of being true
    
    await prisma.customer.create({
      data: {
        user_id: userId,
        type: isJuridica ? 'EMPRESA' : 'PERSONA',
        tipo_doc_identidad: isJuridica ? 'J' : 'V',
        name: isJuridica ? faker.company.name() : faker.person.fullName(),
        doc_number: isJuridica 
          ? faker.string.numeric(9) 
          : faker.string.numeric({ length: { min: 7, max: 8} }),
        email: faker.internet.email(),
        telefono_empresa: `+58${faker.string.numeric(10)}`,
        telefono_celular: `+58${faker.string.numeric(10)}`,
        direccion_fiscal: faker.location.streetAddress(true),
        status: 'ACTIVE',
        price_list_id: faker.helpers.arrayElement(priceLists).id,
        // --- Optional Fields ---
        sitio_web: faker.internet.url(),
        ciudad: faker.location.city(),
        estado: faker.location.state(),
        pais: 'Venezuela',
        codigo_postal: faker.location.zipCode(),
        tipo_venta: faker.helpers.arrayElement(['MAYOR', 'DETAL', 'MAYOR_Y_DETAL']),
        figura_legal: isJuridica ? 'PERSONA_JURIDICA' : 'EMPRENDEDOR_SOLO_CON_RIF',
        tipo_empresa: isJuridica ? faker.helpers.arrayElement(['EMPRESA', 'COMERCIO', 'DISTRIBUIDORA']) : null,
        email_user_masiva_SMS: faker.internet.email(),
        email_user_masiva_whatsapp: faker.internet.email(),
        is_agente_retencion: isAgenteRetencion,
        porcent_retencion_iva: isAgenteRetencion ? 75 : null,
        porcent_retencion_islr: isAgenteRetencion ? 2 : null,
        porcent_retencion_municipio: isAgenteRetencion ? faker.number.int({min: 0, max: 5}) : null,
        // --- JSONB Fields ---
        persona_contacto_info: {
            nombre: faker.person.fullName(),
            email: faker.internet.email(),
            telefono: `+58${faker.string.numeric(10)}`,
            telefono_celular: `+58${faker.string.numeric(10)}`,
            cargo: faker.person.jobTitle(),
        },
        representante_legal_info: {
            nombre: faker.person.fullName(),
            email: faker.internet.email(),
            cedula: `V-${faker.string.numeric(8)}`,
            telefono_celular: `+58${faker.string.numeric(10)}`,
            cargo: 'Director',
        },
        persona_cobranza_info: {
            nombre: faker.person.fullName(),
            email: faker.internet.email(),
            telefono: `+58${faker.string.numeric(10)}`,
            telefono_celular: `+58${faker.string.numeric(10)}`,
            cargo: 'Analista de Cobranzas',
        },
        documento_constitutivo_info: isJuridica ? {
            nombre_registro: 'Registro Mercantil Primero',
            fecha_registro: faker.date.past({ years: 5 }).toISOString().split('T')[0],
            nro_tomo: `Tomo ${faker.string.numeric(1)}-A`,
            email_registro: faker.internet.email(),
        } : Prisma.JsonNull,
        documents: Prisma.JsonNull,
        bank_account_info: Prisma.JsonNull,
        socios_info: Prisma.JsonNull,
      },
    });
    console.log(`>>> Cliente ${i + 1} creado exitosamente.`);
  }

  console.log('✅ Seeding completado: Se crearon 4 clientes y sus datos asociados.');
}

main()
  .catch((e) => {
    console.error('Ocurrió un error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Desconectado de la base de datos.');
  });
