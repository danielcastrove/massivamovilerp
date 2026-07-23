import { prisma } from "../src/lib/db.ts";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const customerId = "3720e074-cb0c-4fa3-b5df-eabb11df720b";

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    console.error("❌ Cliente entcorp no encontrado");
    return;
  }

  let product = await prisma.product.findFirst({ where: { billing_cycle: { not: null } } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        sku: `SEED_EXP6_${Date.now()}`,
        name: "Servicio Premium - Prueba Vencimiento 6d",
        type: "RECURRENT",
        billing_cycle: "MONTHLY",
      },
    });
  }

  const now = new Date();
  const venceEn = 6;
  const expirationDate = new Date(now.getTime() + venceEn * 24 * 60 * 60 * 1000);

  const invoice = await prisma.invoice.create({
    data: {
      customer_id: customerId,
      type: "FACTURA",
      status: "PAID",
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
      currency_mode: "USD",
      invoice_items: {
        create: {
          product_id: product.id,
          quantity: 1,
          unit_price_usd: 100,
          total_usd: 100,
        },
      },
    },
  });

  console.log("✅ Factura de prueba (6 días) creada:");
  console.log(`   ID: ${invoice.id}`);
  console.log(`   Cliente: ${customer.name}`);
  console.log(`   Producto: ${product.name}`);
  console.log(`   Vence: ${expirationDate.toISOString()}`);
  console.log(`   (${venceEn} días desde ahora)`);
  console.log("");
  console.log("El cron la detectará automáticamente durante 6 días.");
  console.log("Corre cada 24h a las 8:00 AM VET (12:00 UTC).");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e);
  prisma.$disconnect();
});
