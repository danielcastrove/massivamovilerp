
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const originalTlsStatus = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  try {
    // 1. Scraping del BCV
    const { data } = await axios.get('https://www.bcv.org.ve/', { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36' } 
    });
    const $ = cheerio.load(data);
    const bcvRate = parseFloat($('#dolar').find('strong').text().replace(/,/g, '.').trim());
    const dateText = $('.pull-right span.date-display-single').first().text().trim();

    if (isNaN(bcvRate) || !dateText) {
      throw new Error('Error al extraer datos del BCV');
    }

    // Parsear fecha valor
    const dateParts = dateText.split(' ').filter(Boolean);
    const months: { [key: string]: number } = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };
    const fechaValor = new Date(Date.UTC(parseInt(dateParts[3], 10), months[dateParts[2].toLowerCase()], parseInt(dateParts[1], 10)));

    // 2. Lógica de Gaps
    const lastRate = await prisma.tasaBcv.findFirst({
      where: { fecha_efectiva: { lt: fechaValor } },
      orderBy: { fecha_efectiva: 'desc' },
    });

    let fechaInicio = fechaValor;
    if (lastRate) {
      const nextDay = new Date(lastRate.fecha_efectiva);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      if (fechaValor > nextDay) fechaInicio = nextDay;

      const finAnterior = new Date(fechaInicio);
      finAnterior.setUTCDate(finAnterior.getUTCDate() - 1);
      await prisma.tasaBcv.update({ where: { id: lastRate.id }, data: { fecha_fin: finAnterior } });
    }

    const farFuture = new Date(Date.UTC(2099, 11, 31));
    const activeRate = await prisma.tasaBcv.upsert({
      where: { fecha_efectiva: fechaValor },
      update: { tasa: bcvRate, fecha_inicio: fechaInicio, fecha_fin: farFuture },
      create: { tasa: bcvRate, fecha_efectiva: fechaValor, fecha_inicio: fechaInicio, fecha_fin: farFuture },
    });

    // 3. Actualización de Parámetro
    const rateValueStr = Number(activeRate.tasa).toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    await prisma.parametro.upsert({
      where: { key: 'tasa_bcv' },
      update: { value: rateValueStr },
      create: { key: 'tasa_bcv', value: rateValueStr },
    });

    // 4. Éxito total
    await sendSuccessEmail(adminEmail, rateValueStr, activeRate.fecha_inicio, activeRate.fecha_fin, fechaValor);
    return NextResponse.json({ success: true, tasa: rateValueStr });

  } catch (error) {
    console.error('Error en el cron, buscando tasa vigente en DB...', error);
    
    // 5. Fallback: Si el scraping falla, ¿tenemos una tasa vigente para hoy en la DB?
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const fallbackRate = await prisma.tasaBcv.findFirst({
      where: {
        fecha_inicio: { lte: today },
        fecha_fin: { gte: today },
      },
      orderBy: { fecha_efectiva: 'desc' }
    });

    if (fallbackRate) {
      const rateStr = Number(fallbackRate.tasa).toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
      await sendSuccessEmail(adminEmail, rateStr, fallbackRate.fecha_inicio, fallbackRate.fecha_fin, fallbackRate.fecha_efectiva, true);
      return NextResponse.json({ success: true, message: 'Usando tasa vigente en sistema (scraping falló)', tasa: rateStr });
    }

    // 6. Error Real: No hay tasa ni en web ni en DB
    await sendErrorEmail(adminEmail, error instanceof Error ? error.message : 'Error desconocido');
    return new NextResponse(JSON.stringify({ success: false, error: 'Sin tasa disponible' }), { status: 500 });

  } finally {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsStatus;
  }
}

async function sendSuccessEmail(to: string, rate: string, inicio: Date, fin: Date | null, valor: Date, isFallback = false) {
  // Para el correo, si es fin de semana o no hay actualización, mostramos la fecha del portal (valor) como fin
  // pero en la DB sigue siendo farFuture para mantener la vigencia.
  const displayFin = valor.toISOString().split('T')[0];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://massivamovilerp.vercel.app';

  const html = `
    <div style="text-align: center; font-family: Arial, sans-serif; color: #333;">
      <img src="${baseUrl}/massivamovil.png" alt="MassivaMovil Logo" style="max-width: 150px; margin-bottom: 20px;">
      <h1 style="color: #6D28D9;">${isFallback ? 'Tasa BCV Vigente' : 'Tasa BCV Actualizada'}</h1>
      <p>${isFallback ? 'Se mantiene la tasa actual del sistema (el portal del BCV no respondió).' : 'Sincronización exitosa con el portal del BCV.'}</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block; text-align: left;">
        <p><strong>Tasa:</strong> ${rate} Bs.</p>
        <p><strong>Válida desde:</strong> ${inicio.toISOString().split('T')[0]}</p>
        <p><strong>Válida hasta:</strong> ${displayFin}</p>
        <p><strong>Fecha Valor (BCV):</strong> ${valor.toISOString().split('T')[0]}</p>
      </div>
    </div>
  `;
  await sendEmail({ to, subject: `Tasa BCV: ${rate} Bs.`, html });
}

async function sendErrorEmail(to: string, error: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://massivamovilerp.vercel.app';
  const html = `
    <div style="text-align: center; font-family: Arial, sans-serif; color: #333;">
      <img src="${baseUrl}/massivamovil.png" alt="MassivaMovil Logo" style="max-width: 150px; margin-bottom: 20px;">
      <h1 style="color: #D92828;">Error Crítico: Sin Tasa BCV</h1>
      <p>No se pudo obtener la tasa de la web ni se encontró una tasa vigente en la base de datos.</p>
      <p style="background: #fee; padding: 10px; border-left: 5px solid #D92828;">${error}</p>
    </div>
  `;
  await sendEmail({ to, subject: 'Error Crítico: Sincronización BCV Fallida', html });
}
