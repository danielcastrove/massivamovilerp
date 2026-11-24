import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApiKeyAuth } from '@/lib/apikey-guard';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(req, async (ctx) => {
    if (!ctx?.fromApiKey && !ctx?.session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (ctx?.session?.user?.role === 'CLIENTE') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
      const { id } = await params;
      const body = await req.json();
      const { 
        type, 
        items, 
        currencyRate, 
        currencyMode,
        totalUsd, 
        totalBs, 
        subtotalUsd, 
        taxAmountUsd, 
        igtfAmountUsd,
        totalRetBs,
        due_date,
        issue_date,
        proximo_vencimiento_producto
      } = body;

      const newIssueDate = issue_date ? new Date(issue_date) : undefined;
      const newDueDate = due_date ? new Date(due_date) : undefined;
      // Si no viene el vencimiento de la factura, se mantiene el comportamiento previo (copia el de servicio)
      const newProximo = proximo_vencimiento_producto
        ? new Date(proximo_vencimiento_producto)
        : newDueDate;

      if (newIssueDate && newDueDate && newDueDate < newIssueDate) {
        return NextResponse.json(
          { message: "La fecha de vencimiento no puede ser anterior a la fecha de emisión" },
          { status: 400 }
        );
      }

      if (newIssueDate && newProximo && newProximo < newIssueDate) {
        return NextResponse.json(
          { message: "La fecha de vencimiento de la factura no puede ser anterior a la fecha de emisión" },
          { status: 400 }
        );
      }

      // Actualizar factura y sus items en una transacción
      const updatedInvoice = await prisma.$transaction(async (tx) => {
        // 1. Eliminar items anteriores
        await tx.invoiceItem.deleteMany({
          where: { invoice_id: id }
        });

        // 2. Actualizar cabecera de la factura
        const invoice = await tx.invoice.update({
          where: { id },
          data: {
            type,
            currency_mode: currencyMode,
            issue_date: newIssueDate,
            due_date: newDueDate,
            proximo_vencimiento_producto: newProximo,
            currency_rate: currencyRate,
            subtotal_usd: subtotalUsd,
            tax_amount_usd: taxAmountUsd,
            igtf_amount_usd: igtfAmountUsd || 0,
            total_usd: totalUsd,
            subtotal_bs: subtotalUsd * currencyRate,
            tax_amount_bs: taxAmountUsd * currencyRate,
            total_bs: totalBs,
            retention_amount_bs: totalRetBs,
            // Re-crear los items
            invoice_items: {
              create: items.map((item: any) => ({
                product_id: item.isCustom ? null : item.productId,
                price_list_id: item.isCustom ? null : item.priceListId,
                is_custom: item.isCustom || false,
                custom_name: item.isCustom ? item.customName : null,
                quantity: item.quantity,
                unit_price_usd: item.unitPriceUsd,
                total_usd: item.totalUsd,
              }))
            }
          }
        });

        return invoice;
      });

      return NextResponse.json(updatedInvoice);
    } catch (error: any) {
      console.error('[INVOICE_PUT]', error);
      return NextResponse.json({ message: error.message || 'Internal Error' }, { status: 500 });
    }
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(req, async (ctx) => {
    if (!ctx?.fromApiKey && !ctx?.session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (ctx?.session?.user?.role === 'CLIENTE') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
      const { id } = await params;
      const { status } = await req.json();

      if (!status) {
        return NextResponse.json({ message: 'Status is required' }, { status: 400 });
      }

      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: { status }
      });

      return NextResponse.json(updatedInvoice);
    } catch (error: any) {
      console.error('[INVOICE_PATCH]', error);
      return NextResponse.json({ message: error.message || 'Internal Error' }, { status: 500 });
    }
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(req, async (ctx) => {
    if (!ctx?.fromApiKey && !ctx?.session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (ctx?.session?.user?.role === 'CLIENTE') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
      const { id } = await params;

      await prisma.$transaction(async (tx) => {
        // Eliminar items primero
        await tx.invoiceItem.deleteMany({
          where: { invoice_id: id }
        });

        // Eliminar factura
        await tx.invoice.delete({
          where: { id }
        });
      });

      return new NextResponse(null, { status: 204 });
    } catch (error: any) {
      console.error('[INVOICE_DELETE]', error);
      return NextResponse.json({ message: error.message || 'Internal Error' }, { status: 500 });
    }
  });
}
