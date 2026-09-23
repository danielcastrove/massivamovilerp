import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { differenceInDays, addDays } from "date-fns";
import { getBillingCycleDays } from "@/lib/utils/recurrence";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (
      !session ||
      (session.user.role !== "MASSIVA_ADMIN" && session.user.role !== "MASSIVA_EXTRA")
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice_items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ message: "Factura no encontrada" }, { status: 404 });
    }

    if (invoice.status !== "PAID") {
      return NextResponse.json(
        { message: "Solo se pueden renovar facturas pagadas" },
        { status: 400 }
      );
    }

    const today = new Date();
    const dueDate = new Date(
      invoice.proximo_vencimiento_producto || invoice.due_date
    );
    const daysDiff = differenceInDays(dueDate, today);

    if (daysDiff < -7 || daysDiff > 7) {
      return NextResponse.json(
        { message: "La factura no está en el rango de renovación permitido (-7 a +7 días del vencimiento)" },
        { status: 400 }
      );
    }

    const latestBcvRate = await prisma.tasaBcv.findFirst({
      orderBy: { fecha_efectiva: "desc" },
    });

    if (!latestBcvRate) {
      return NextResponse.json(
        { message: "Tasa BCV no encontrada" },
        { status: 500 }
      );
    }

    const currentRate = latestBcvRate.tasa.toNumber();

    let daysToAdd = 30;
    const products = invoice.invoice_items
      .map((i: any) => i.product)
      .filter(Boolean);
    if (products.length > 0) {
      daysToAdd = Math.max(
        ...products.map((p: any) => getBillingCycleDays(p?.billing_cycle)),
        30
      );
    }

    const newDueDate = addDays(today, daysToAdd);
    const isFactura = invoice.type === "FACTURA";
    const docParamKey = isFactura ? "ULTIMO_NUMERO_FACTURA" : "ULTIMO_NUMERO_RECIBO";
    const controlParamKey = isFactura ? "ULTIMO_NUMERO_CONTROL" : "ULTIMO_NUMERO_CONTROL_RECIBO";

    const result = await prisma.$transaction(async (tx) => {
      const [lastDocParam, lastControlParam] = await Promise.all([
        tx.parametro.findUnique({ where: { key: docParamKey } }),
        tx.parametro.findUnique({ where: { key: controlParamKey } }),
      ]);

      const MAX_DOC_NUM = 9999999;
      const RESET_DOC_NUM = 1000000;

      let nextDocNum = (parseInt(lastDocParam?.value || "1000000")) + 1;
      let nextControlNum = (parseInt(lastControlParam?.value || "1000000")) + 1;

      if (nextDocNum > MAX_DOC_NUM) nextDocNum = RESET_DOC_NUM;
      if (nextControlNum > MAX_DOC_NUM) nextControlNum = RESET_DOC_NUM;

      await tx.parametro.update({
        where: { key: docParamKey },
        data: { value: nextDocNum.toString() },
      });
      await tx.parametro.update({
        where: { key: controlParamKey },
        data: { value: nextControlNum.toString() },
      });

      const invoiceItemsData = invoice.invoice_items.map((item) => ({
        product_id: item.product_id,
        price_list_id: item.price_list_id,
        is_custom: item.is_custom,
        custom_name: item.custom_name,
        quantity: item.quantity,
        unit_price_usd: new Prisma.Decimal(item.unit_price_usd),
        total_usd: new Prisma.Decimal(item.total_usd),
      }));

      const subtotalUsd = Number(invoice.subtotal_usd);
      const taxAmountUsd = Number(invoice.tax_amount_usd);
      const igtfAmountUsd = Number(invoice.igtf_amount_usd);
      const totalUsd = Number(invoice.total_usd);

      const subtotalBs = subtotalUsd * currentRate;
      const taxAmountBs = taxAmountUsd * currentRate;
      const totalBs = totalUsd * currentRate;

      let retIvaBs = 0;
      let retIslrBs = 0;
      let retMunBs = 0;

      if (isFactura && invoice.customer) {
        const percIva = invoice.customer.porcent_retencion_iva
          ? invoice.customer.porcent_retencion_iva.toNumber()
          : 75;
        const percIslr = invoice.customer.porcent_retencion_islr
          ? invoice.customer.porcent_retencion_islr.toNumber()
          : 2;
        const percMun = invoice.customer.porcent_retencion_municipio
          ? invoice.customer.porcent_retencion_municipio.toNumber()
          : 0;

        retIvaBs = taxAmountBs * (percIva / 100);
        retIslrBs = subtotalBs * (percIslr / 100);
        retMunBs = subtotalBs * (percMun / 100);

        if (retIvaBs > 0) {
          await tx.parametro.update({
            where: { key: "ULTIMO_NUMERO_RETENCION_IVA" },
            data: { value: retIvaBs.toFixed(2) },
          });
        }
        if (retIslrBs > 0) {
          await tx.parametro.update({
            where: { key: "ULTIMO_NUMERO_RETENCION_ISLR" },
            data: { value: retIslrBs.toFixed(2) },
          });
        }
      }

      const retentionAmountBs = retIvaBs + retIslrBs + retMunBs;

      const newInvoice = await tx.invoice.create({
        data: {
          customer_id: invoice.customer_id,
          type: invoice.type,
          currency_mode: invoice.currency_mode as any,
          status: "PAID",
          issue_date: today,
          due_date: newDueDate,
          invoice_number: nextDocNum,
          control_number: nextControlNum,
          currency_rate: new Prisma.Decimal(currentRate),
          subtotal_usd: new Prisma.Decimal(subtotalUsd),
          tax_amount_usd: new Prisma.Decimal(taxAmountUsd),
          igtf_amount_usd: new Prisma.Decimal(igtfAmountUsd),
          total_usd: new Prisma.Decimal(totalUsd),
          subtotal_bs: new Prisma.Decimal(subtotalBs),
          tax_amount_bs: new Prisma.Decimal(taxAmountBs),
          total_bs: new Prisma.Decimal(totalBs),
          retention_amount_bs: new Prisma.Decimal(retentionAmountBs),
          proximo_vencimiento_producto: newDueDate,
          invoice_items: {
            create: invoiceItemsData,
          },
        },
      });

      const newPayment = await tx.payment.create({
        data: {
          customer_id: invoice.customer_id,
          type: invoice.type,
          amount_paid: new Prisma.Decimal(totalUsd),
          currency: "USD",
          exchange_rate: new Prisma.Decimal(currentRate),
          payment_method: "RENOVACION",
          reference: `Renovación ${isFactura ? "Factura" : "Recibo"} #${invoice.invoice_number || invoice.id.slice(0, 8)}`,
          payment_date: today,
        },
      });

      return { newInvoice, newPayment };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[INVOICE_RENEW_ERROR]", error);
    return NextResponse.json(
      { message: error.message || "Error al renovar factura" },
      { status: 500 }
    );
  }
}
