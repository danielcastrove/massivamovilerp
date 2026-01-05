
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function GET() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'; // Usar variable de entorno o fallback
  if (!process.env.ADMIN_EMAIL) {
    console.warn('ADMIN_EMAIL no está configurado en las variables de entorno. Usando admin@example.com como fallback.');
  }
  try {
    const now = new Date();
    const venezuelaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));

    const todayInVenezuela = new Date(Date.UTC(
      venezuelaDate.getFullYear(),
      venezuelaDate.getMonth(),
      venezuelaDate.getDate()
    ));

    const activeRate = await prisma.tasaBcv.findFirst({
      where: {
        fecha_inicio: { lte: todayInVenezuela },
        fecha_fin: { gte: todayInVenezuela },
      },
      orderBy: {
        fecha_efectiva: 'desc',
      },
    });

    if (!activeRate) {
      throw new Error(`No se encontró una tasa de BCV activa para hoy: ${todayInVenezuela.toISOString().split('T')[0]}`);
    }

    const rateValue = activeRate.tasa.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    const fechaInicio = activeRate.fecha_inicio.toISOString().split('T')[0];
    const fechaFin = activeRate.fecha_fin?.toISOString().split('T')[0];

    await prisma.parametro.upsert({
      where: { key: 'tasa_bcv' },
      update: { value: rateValue },
      create: { key: 'tasa_bcv', value: rateValue },
    });

    console.log(`Active BCV rate updated in Parametro: ${rateValue}`);
    
    const emailHtml = `
      <div style="text-align: center; font-family: Arial, sans-serif; color: #333;">
        <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/massivamovil.png" alt="MassivaMovil Logo" style="max-width: 150px; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;">
        <h1 style="color: #6D28D9;">Actualización de Tasa BCV</h1>
        <p>La tasa del BCV ha sido actualizada exitosamente en el sistema.</p>
        <ul style="list-style: none; padding: 0; display: inline-block; text-align: left;">
          <li><strong>Tasa:</strong> ${rateValue}</li>
          <li><strong>Fecha de Inicio de Validez:</strong> ${fechaInicio}</li>
          <li><strong>Fecha de Fin de Validez:</strong> ${fechaFin}</li>
        </ul>
        <p style="margin-top: 30px; font-size: 0.8em; color: #777;">Este es un mensaje automático. Por favor, no responda a este correo.</p>
      </div>
    `;
    
    const previewUrl = await sendEmail({
      to: adminEmail,
      subject: 'Tasa de BCV Actualizada',
      html: emailHtml,
    });

    return NextResponse.json({
      message: 'Parámetro de tasa_bcv actualizado con éxito.',
      tasa_activa: rateValue,
      email_preview_url: previewUrl
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido';
    console.error('Error en el cron job de actualización de tasa activa:', error);

    const emailHtml = `
      <div style="text-align: center; font-family: Arial, sans-serif; color: #333;">
        <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/massivamovil.png" alt="MassivaMovil Logo" style="max-width: 150px; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;">
        <h1 style="color: #D92828;">Error en la Actualización de Tasa BCV</h1>
        <p>Ocurrió un error al intentar actualizar la tasa del BCV en el sistema.</p>
        <p style="text-align: left; display: inline-block; background-color: #fdd; padding: 10px; border-left: 5px solid #D92828;">
          <strong>Error:</strong> ${errorMessage}
        </p>
        <p style="margin-top: 30px; font-size: 0.8em; color: #777;">Este es un mensaje automático. Por favor, no responda a este correo.</p>
      </div>
    `;

    try {
      const previewUrl = await sendEmail({
        to: adminEmail,
        subject: 'Error al Actualizar Tasa de BCV',
        html: emailHtml,
      });
      return new NextResponse(JSON.stringify({ message: 'Error interno del servidor. Se envió correo de notificación.', error: errorMessage, email_preview_url: previewUrl }), { status: 500 });
    } catch (emailError) {
        console.error('Error enviando el correo de notificación de error:', emailError);
        return new NextResponse(JSON.stringify({ message: 'Error interno del servidor. Falló también el envío de correo de notificación.', error: errorMessage }), { status: 500 });
    }
  }
}
