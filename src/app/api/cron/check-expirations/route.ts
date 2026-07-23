import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const invoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        proximo_vencimiento_producto: {
          gte: now,
          lte: in7Days,
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
            persona_contacto_info: true,
            persona_cobranza_info: true,
          },
        },
        invoice_items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    const results: Array<{ customerName: string; vence: string; sms: boolean; whatsapp: boolean; email: boolean }> = [];

    for (const invoice of invoices) {
      const customer = invoice.customer;
      const productName = invoice.invoice_items[0]?.product?.name || invoice.invoice_items[0]?.custom_name || 'Servicio';
      const expirationDate = invoice.proximo_vencimiento_producto!;
      const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const venceStr = expirationDate.toLocaleDateString('es-VE', { timeZone: 'UTC' });

      const message = `Hola ${customer.name}, su servicio "${productName}" vence el ${venceStr} (faltan ${daysLeft} día(s)). Comuníquese con nosotros para renovarlo.`;

      const phone = customer.telefono_empresa || customer.telefono_celular;
      const email = customer.email;
      const customerName = customer.name || '';

      const sentSms = phone ? !!(await sendNotification({ to: phone, customerName, message, type: 'SMS' })) : false;
      const sentWhatsApp = phone ? !!(await sendNotification({ to: phone, customerName, message, type: 'WHATSAPP' })) : false;
      const sentEmail = email ? !!(await sendNotification({ to: email, customerName, message: `<p>${message}</p>`, type: 'EMAIL', subject: 'Recordatorio de Vencimiento - MassivaMovil' })) : false;

      results.push({ customerName: customer.name || '', vence: venceStr, sms: sentSms, whatsapp: sentWhatsApp, email: sentEmail });
    }

    return NextResponse.json({
      checkedAt: now.toISOString(),
      totalExpiring: invoices.length,
      results,
    });
  } catch (error) {
    console.error('[CRON_CHECK_EXPIRATIONS] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
