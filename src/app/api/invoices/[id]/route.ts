import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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
      due_date
    } = body;

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
          due_date: due_date ? new Date(due_date) : undefined,
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
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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
}
