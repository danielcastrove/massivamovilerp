// massivamovilerp/src/app/api/invoices/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "MASSIVA_ADMIN" && session.user.role !== "MASSIVA_EXTRA")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, type, items, currencyRate } = body;

    // 1. Obtener datos del cliente para validar retenciones y lista de precios
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { priceList: true },
    });

    if (!customer) {
      return NextResponse.json({ message: "Cliente no encontrado" }, { status: 404 });
    }

    // 2. Transacción para asegurar integridad
    const result = await prisma.$transaction(async (tx) => {
      let subtotalUsd = 0;
      const invoiceItemsData = [];

      // Validar items y calcular subtotales en el servidor (Seguridad)
      for (const item of items) {
        const productPrice = await tx.productPrice.findUnique({
          where: {
            product_id_price_list_id: {
              product_id: item.productId,
              price_list_id: customer.price_list_id || "",
            },
          },
          include: { product: true },
        });

        if (!productPrice) {
          throw new Error(`Precio no encontrado para el producto ${item.productId}`);
        }

        const price = productPrice.price_usd.toNumber();
        const itemTotalUsd = price * item.quantity;
        subtotalUsd += itemTotalUsd;

        invoiceItemsData.push({
          product_id: item.productId,
          price_list_id: customer.price_list_id || "",
          quantity: item.quantity,
          unit_price_usd: productPrice.price_usd,
          total_usd: new Prisma.Decimal(itemTotalUsd),
        });
      }

      // Cálculos Fiscales
      const subtotalBs = subtotalUsd * currencyRate;
      const taxRate = type === "FACTURA" ? 0.16 : 0;
      const taxAmountUsd = subtotalUsd * taxRate;
      const taxAmountBs = subtotalBs * taxRate;
      
      const totalUsd = subtotalUsd + taxAmountUsd;
      const totalBs = subtotalBs + taxAmountBs;

      // Retenciones
      let retIvaBs = 0;
      let retIslrBs = 0;
      let retMunBs = 0;

      if (customer.is_agente_retencion && type === "FACTURA") {
        const percIva = customer.porcent_retencion_iva ? customer.porcent_retencion_iva.toNumber() : 75;
        const percIslr = customer.porcent_retencion_islr ? customer.porcent_retencion_islr.toNumber() : 2;
        const percMun = customer.porcent_retencion_municipio ? customer.porcent_retencion_municipio.toNumber() : 0;

        retIvaBs = taxAmountBs * (percIva / 100);
        retIslrBs = subtotalBs * (percIslr / 100);
        retMunBs = subtotalBs * (percMun / 100);
      }

      const retentionAmountBs = retIvaBs + retIslrBs + retMunBs;

      // Determinar Fecha de Vencimiento (30 días por defecto para el MVP)
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(issueDate.getDate() + 30);

      // 3. Crear la Factura
      const newInvoice = await tx.invoice.create({
        data: {
          customer_id: customerId,
          type,
          status: "SENT",
          issue_date: issueDate,
          due_date: dueDate,
          currency_rate: new Prisma.Decimal(currencyRate),
          subtotal_usd: new Prisma.Decimal(subtotalUsd),
          tax_amount_usd: new Prisma.Decimal(taxAmountUsd),
          total_usd: new Prisma.Decimal(totalUsd),
          subtotal_bs: new Prisma.Decimal(subtotalBs),
          tax_amount_bs: new Prisma.Decimal(taxAmountBs),
          total_bs: new Prisma.Decimal(totalBs),
          retention_amount_bs: new Prisma.Decimal(retentionAmountBs),
          proximo_vencimiento_producto: dueDate, // Importante para el motor de alertas
          invoice_items: {
            create: invoiceItemsData,
          },
        },
      });

      // 4. Actualizar el próximo vencimiento en el cliente (Core Recurrencia)
      // Buscamos si hay productos recurrentes para actualizar la fecha global del cliente
      const products = await tx.product.findMany({
        where: { id: { in: items.map((i: any) => i.productId) } }
      });

      const hasRecurrent = products.some(p => p.type === "RECURRENT");
      if (hasRecurrent) {
        await tx.customer.update({
          where: { id: customerId },
          data: { 
            // Para el MVP, usamos la fecha de vencimiento de la factura como marca
            updated_at: new Date()
          }
        });
      }

      return newInvoice;
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("Invoice Error:", error);
    return NextResponse.json({ message: error.message || "Error interno" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const invoices = await prisma.invoice.findMany({
      include: {
        customer: {
          include: {
            user: {
              select: {
                nombre: true,
                apellido: true,
                email: true,
                telefono_celular: true
              }
            }
          }
        },
        invoice_items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { issue_date: "desc" }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ message: "Error fetching invoices" }, { status: 500 });
  }
}
