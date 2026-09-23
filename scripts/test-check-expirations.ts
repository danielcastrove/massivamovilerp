import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { prisma } from "../src/lib/db.ts";

async function main() {
  console.log("--- Test: Check Expirations ---");

  // 1. Buscar un producto recurrente existente
  let product = await prisma.product.findFirst({
    where: { billing_cycle: { not: null } },
  });

  // Si no existe, crear uno
  if (!product) {
    product = await prisma.product.create({
      data: {
        sku: `TEST_EXP_${Date.now()}`,
        name: `Servicio Test Expiración ${Date.now()}`,
        type: 'RECURRENT',
        billing_cycle: 'MONTHLY',
      },
    });
    console.log("✅ Producto creado:", product.name);
  } else {
    console.log("✅ Producto existente:", product.name);
  }

  // 2. Buscar cliente "entcorp" (tiene datos de contacto verificados)
  const customer = await prisma.customer.findUnique({
    where: { id: "3720e074-cb0c-4fa3-b5df-eabb11df720b" },
  });

  if (!customer) {
    console.error("❌ Cliente 'entcorp' no encontrado en la BD.");
    return;
  }

  console.log("✅ Cliente:", customer.name, customer.telefono_celular, customer.email);

  // 3. Crear factura con vencimiento en los próximos 7 días
  const now = new Date();
  const venceEn = 3; // días para el vencimiento (para probar)
  const expirationDate = new Date(now.getTime() + venceEn * 24 * 60 * 60 * 1000);

  const invoice = await prisma.invoice.create({
    data: {
      customer_id: customer.id,
      type: 'FACTURA',
      status: 'SENT',
      issue_date: now,
      due_date: now,
      proximo_vencimiento_producto: expirationDate,
      currency_rate: 1,
      subtotal_usd: 100,
      tax_amount_usd: 0,
      igtf_amount_usd: 0,
      total_usd: 100,
      subtotal_bs: 0,
      tax_amount_bs: 0,
      total_bs: 0,
      retention_amount_bs: 0,
      currency_mode: 'USD',
      invoice_items: {
        create: {
          product_id: product.id,
          quantity: 1,
          unit_price_usd: 100,
          total_usd: 100,
        },
      },
    },
    include: { invoice_items: true },
  });
  console.log("✅ Factura creada ID:", invoice.id);
  console.log("   Vence el:", expirationDate.toISOString());

  // 4. Crear un pago asociado
  try {
    await prisma.payment.create({
      data: {
        customer_id: customer.id,
        type: 'FACTURA',
        amount_paid: 100,
        currency: 'USD',
        exchange_rate: 1,
        payment_method: 'Zelle',
        reference: `TEST_EXP_${Date.now()}`,
        payment_date: now,
      },
    });
    console.log("✅ Pago creado");
  } catch (e) {
    console.log("⚠️ No se pudo crear pago (no crítico):", e);
  }

  // 5. Ejecutar la lógica del cron directamente
  console.log("\n--- Ejecutando lógica de check-expirations ---");

  const past10Days = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const expiringInvoices = await prisma.invoice.findMany({
    where: {
      status: 'SENT',
      proximo_vencimiento_producto: {
        gte: past10Days,
        lte: in10Days,
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          telefono_empresa: true,
          telefono_celular: true,
        },
      },
      invoice_items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
  });

  console.log(`Facturas por vencer: ${expiringInvoices.length}`);

  const { sendSmsMassiva } = await import("../src/lib/sms.ts");
  const { sendWhatsAppMassiva } = await import("../src/lib/whatsapp.ts");
  const { sendEmail } = await import("../src/lib/email.ts");

  for (const inv of expiringInvoices) {
    const c = inv.customer;
    const productName = inv.invoice_items[0]?.product?.name || inv.invoice_items[0]?.custom_name || 'Servicio';
    const venceStr = inv.proximo_vencimiento_producto!.toLocaleDateString('es-VE', { timeZone: 'UTC' });
    const daysLeft = Math.ceil((inv.proximo_vencimiento_producto!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const message = `Hola ${c.name}, su servicio "${productName}" vence el ${venceStr} (faltan ${daysLeft} día(s)). Comuníquese con nosotros para renovarlo.`;
    console.log(`   -> ${c.name}: "${productName}" vence ${venceStr} (${daysLeft} días)`);
    console.log(`      Mensaje: ${message}`);

    const phone = c.telefono_celular || c.telefono_empresa;
    const email = c.email;

    const sentSms = phone ? await sendSmsMassiva(phone, message) : null;
    console.log(`      SMS: ${sentSms?.status && Number(sentSms.status) > 0 ? '✅ enviado' : '❌'}`);
    const sentWa = phone ? await sendWhatsAppMassiva(phone, message) : null;
    console.log(`      WhatsApp: ${sentWa ? '✅ enviado' : '❌'}`);
    const sentEmail = email ? await sendEmail({ to: email, subject: 'Recordatorio de Vencimiento - MassivaMovil', html: `<p>${message}</p>` }) : null;
    console.log(`      Email: ${sentEmail ? '✅ enviado' : '❌'}`);
  }

  // 6. Limpiar datos de prueba
  console.log("\n--- Limpiando datos de prueba ---");
  await prisma.invoiceItem.deleteMany({ where: { invoice_id: invoice.id } });
  await prisma.invoice.delete({ where: { id: invoice.id } });
  await prisma.payment.deleteMany({ where: { reference: { startsWith: 'TEST_EXP_' } } });
  if (product.sku.startsWith('TEST_EXP_')) {
    await prisma.product.delete({ where: { id: product.id } });
  }
  console.log("✅ Datos de prueba eliminados");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
