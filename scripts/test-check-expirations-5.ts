import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { prisma } from "../src/lib/db.ts";

async function main() {
  console.log("--- Crear 5 facturas de prueba para el cron del 5/8/2026 ---");

  let product = await prisma.product.findFirst({
    where: { billing_cycle: { not: null } },
  });

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

  const customer = await prisma.customer.findUnique({
    where: { id: "3720e074-cb0c-4fa3-b5df-eabb11df720b" },
  });

  if (!customer) {
    console.error("❌ Cliente 'entcorp' no encontrado en la BD.");
    return;
  }

  console.log("✅ Cliente:", customer.name, customer.telefono_celular, customer.email);

  // El cron corre el 5/8/2026 a las 12:00 UTC. Hitos en días calendario vs el 5/8.
  // +10 → 15/8, +5 → 10/8, 0 → 5/8, -5 → 31/7, -10 → 26/7
  const DAYS: number[] = [10, 5, 0, -5, -10];

  for (const diff of DAYS) {
    const due = new Date(Date.UTC(2026, 7, 5 + diff, 12)); // 12:00 UTC 5/8/2026 ± diff días

    const invoice = await prisma.invoice.create({
      data: {
        customer_id: customer.id,
        type: 'FACTURA',
        status: 'SENT',
        issue_date: new Date(),
        due_date: due,
        proximo_vencimiento_producto: due,
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
    });

    console.log(`✅ diff=${diff}  vence ${due.toISOString()}  factura=${invoice.id}`);
  }

  console.log("\n✅ 5 facturas creadas (estado SENT). El cron del 5/8/2026 debería emitir 1 mensaje por cada una.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());