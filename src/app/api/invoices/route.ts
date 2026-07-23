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
    const { 
      customerId, 
      type, 
      items, 
      currencyRate, 
      applyIgtf, 
      currencyMode,
      due_date,
      invoice_number,
      control_number 
    } = body;

    // 1. Obtener datos del cliente para validar retenciones
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ message: "Cliente no encontrado" }, { status: 404 });
    }

    // 2. Transacción para asegurar integridad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener parámetros y calcular numeración según el tipo
      const isFactura = type === "FACTURA";
      const docParamKey = isFactura ? "ULTIMO_NUMERO_FACTURA" : "ULTIMO_NUMERO_RECIBO";
      
      // Obtenemos los parámetros de numeración y control en paralelo
      const [lastDocParam, lastControlParam] = await Promise.all([
        tx.parametro.findUnique({ where: { key: docParamKey } }),
        tx.parametro.findUnique({ where: { key: "ULTIMO_NUMERO_CONTROL" } })
      ]);

      const nextDocNum = (parseInt(lastDocParam?.value || "100000")) + 1;
      const nextControlNum = (parseInt(lastControlParam?.value || "100000")) + 1;

      // 2. Actualizar parámetros correlativos en la base de datos
      await tx.parametro.update({ where: { key: docParamKey }, data: { value: nextDocNum.toString() } });
      await tx.parametro.update({ where: { key: "ULTIMO_NUMERO_CONTROL" }, data: { value: nextControlNum.toString() } });
      
      let subtotalUsd = 0;
      const invoiceItemsData = [];
      for (const item of items) {
        const unitPrice = Number(item.unitPriceUsd);
        const itemTotalUsd = unitPrice * item.quantity;
        subtotalUsd += itemTotalUsd;

        invoiceItemsData.push({
          product_id: item.isCustom ? null : item.productId,
          price_list_id: item.isCustom ? null : (item.priceListId || customer.price_list_id),
          is_custom: item.isCustom || false,
          custom_name: item.isCustom ? item.customName : null,
          quantity: item.quantity,
          unit_price_usd: new Prisma.Decimal(unitPrice),
          total_usd: new Prisma.Decimal(itemTotalUsd),
        });
      }

      // Cálculos Fiscales comunes
      const subtotalBs = subtotalUsd * currencyRate;
      const taxRate = isFactura ? 0.16 : 0;
      const taxAmountUsd = subtotalUsd * taxRate;
      const taxAmountBs = subtotalBs * taxRate;
      const finalIgtfUsd = applyIgtf ? (subtotalUsd + taxAmountUsd) * 0.03 : 0;
      const totalUsd = subtotalUsd + taxAmountUsd + finalIgtfUsd;
      const totalBs = (subtotalUsd + taxAmountUsd + finalIgtfUsd) * currencyRate;

      // Cálculos de Retención (SOLO SI ES FACTURA)
      let retIvaBs = 0;
      let retIslrBs = 0;
      let retMunBs = 0;

      if (isFactura) {
        const percIva = customer.porcent_retencion_iva ? customer.porcent_retencion_iva.toNumber() : 75;
        const percIslr = customer.porcent_retencion_islr ? customer.porcent_retencion_islr.toNumber() : 2;
        const percMun = customer.porcent_retencion_municipio ? customer.porcent_retencion_municipio.toNumber() : 0;

        retIvaBs = taxAmountBs * (percIva / 100);
        retIslrBs = subtotalBs * (percIslr / 100);
        retMunBs = subtotalBs * (percMun / 100);

        // Actualizar parámetros de retención (solo si hay monto)
        if (retIvaBs > 0) await tx.parametro.update({ where: { key: "ULTIMO_NUMERO_RETENCION_IVA" }, data: { value: retIvaBs.toFixed(2) } });
        if (retIslrBs > 0) await tx.parametro.update({ where: { key: "ULTIMO_NUMERO_RETENCION_ISLR" }, data: { value: retIslrBs.toFixed(2) } });
      }

      const retentionAmountBs = retIvaBs + retIslrBs + retMunBs;
      
      // ... (Creación del documento) ...


      // Determinar Fecha de Vencimiento
      const issueDate = new Date();
      const dueDate = due_date ? new Date(due_date) : new Date();
      if (!due_date) dueDate.setDate(issueDate.getDate() + 30);

      // 3. Crear la Factura
      const newInvoice = await tx.invoice.create({
        data: {
          customer_id: customerId,
          type,
          // @ts-ignore - Forzamos el campo para bypass de caché de tipos en Next.js/Turbopack
          currency_mode: (currencyMode || "USD_BS") as any,
          status: "SENT",
          issue_date: issueDate,
          due_date: dueDate,
          invoice_number: nextDocNum,
          control_number: nextControlNum,
          currency_rate: new Prisma.Decimal(currencyRate),
          subtotal_usd: new Prisma.Decimal(subtotalUsd),
          tax_amount_usd: new Prisma.Decimal(taxAmountUsd),
          igtf_amount_usd: new Prisma.Decimal(finalIgtfUsd),
          total_usd: new Prisma.Decimal(totalUsd),
          subtotal_bs: new Prisma.Decimal(subtotalBs),
          tax_amount_bs: new Prisma.Decimal(taxAmountBs),
          total_bs: new Prisma.Decimal(totalBs),
          retention_amount_bs: new Prisma.Decimal(retentionAmountBs),
          proximo_vencimiento_producto: dueDate,
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
