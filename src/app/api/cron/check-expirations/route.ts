import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { differenceInCalendarDays, startOfDay, endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const REMINDER_DAYS = [10, 5, 0, -5, -10];
const MORA_AFTER_DAYS = 10;

export async function GET() {
  try {
    const now = new Date();

    // Ventana amplia en días de calendario (startOfDay/endOfDay) para no perder
    // hitos exactos por la diferencia entre la hora de ejecución y la hora de
    // la fecha de vencimiento.
    const windowStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 11));
    const windowEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 11));

    // 1. Facturas SENT (pendientes de pago) dentro de la ventana de avisos (±10 días del vencimiento)
    const invoices = await prisma.invoice.findMany({
      where: {
        status: 'SENT',
        proximo_vencimiento_producto: {
          gte: windowStart,
          lte: windowEnd,
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

    const results: Array<{ customerName: string; vence: string; diasParaVencer: number; sms: boolean; whatsapp: boolean; email: boolean }> = [];

    for (const invoice of invoices) {
      const customer = invoice.customer;
      const expirationDate = invoice.proximo_vencimiento_producto!;
      const daysDiff = differenceInCalendarDays(expirationDate, now);

      // Solo avisar en los hitos exactos: 10 y 5 días antes, el mismo día, 5 y 10 días después
      if (!REMINDER_DAYS.includes(daysDiff)) continue;

      const productName = invoice.invoice_items[0]?.product?.name || invoice.invoice_items[0]?.custom_name || 'Servicio';
      const venceStr = expirationDate.toLocaleDateString('es-VE', { timeZone: 'UTC' });

      let message: string;
      if (daysDiff > 0) {
        message = `Hola ${customer.name}, su servicio "${productName}" vence el ${venceStr} (faltan ${daysDiff} día(s)). Comuníquese con nosotros para renovarlo.`;
      } else if (daysDiff === 0) {
        message = `Hola ${customer.name}, su servicio "${productName}" vence HOY (${venceStr}). Comuníquese con nosotros para renovarlo.`;
      } else {
        message = `Hola ${customer.name}, su servicio "${productName}" venció el ${venceStr} (hace ${Math.abs(daysDiff)} día(s)). Renueve para no interrumpir su servicio.`;
      }

      const phone = customer.telefono_empresa || customer.telefono_celular;
      const email = customer.email;
      const customerName = customer.name || '';

      const sentSms = phone ? !!(await sendNotification({ to: phone, customerName, message, type: 'SMS' })) : false;
      const sentWhatsApp = phone ? !!(await sendNotification({ to: phone, customerName, message, type: 'WHATSAPP' })) : false;
      const sentEmail = email ? !!(await sendNotification({ to: email, customerName, message: `<p>${message}</p>`, type: 'EMAIL', subject: 'Recordatorio de Vencimiento - MassivaMovil' })) : false;

      results.push({ customerName: customer.name || '', vence: venceStr, diasParaVencer: daysDiff, sms: sentSms, whatsapp: sentWhatsApp, email: sentEmail });
    }

    // 2. Pasar a MORA las facturas SENT vencidas hace más de 10 días
    //    (después de 10 días ya no se envía aviso; se marca el estado como OVERDUE)
    const moraDeadline = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - MORA_AFTER_DAYS));

    const toMora = await prisma.invoice.updateMany({
      where: {
        status: 'SENT',
        proximo_vencimiento_producto: {
          not: null,
          lte: moraDeadline,
        },
      },
      data: { status: 'OVERDUE' },
    });

    return NextResponse.json({
      checkedAt: now.toISOString(),
      totalExpiring: results.length,
      results,
      markedAsMora: toMora.count,
    });
  } catch (error) {
    console.error('[CRON_CHECK_EXPIRATIONS] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
