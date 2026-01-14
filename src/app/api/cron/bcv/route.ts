
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/db';

export async function GET() {
  // ADVERTENCIA: La siguiente línea deshabilita la verificación de certificados SSL.
  // Úselo solo para fines de desarrollo y si confía en el punto final.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  try {
    const bcvUrl = 'https://www.bcv.org.ve/';

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    };

    const { data } = await axios.get(bcvUrl, { headers: headers });
    const $ = cheerio.load(data);

    // console.log('--- [BCV Cron] Dry Run: Start ---');

    // --- Extracción del Valor del Dólar ---
    const dollarValue = $('#dolar').find('strong').text();
    const cleanDollarValue = dollarValue.replace(/,/g, '.');
    const bcvRate = parseFloat(cleanDollarValue);
    // console.log(`[BCV Cron] Step 1: Scraped Data. Rate found: ${bcvRate}`);

    if (isNaN(bcvRate)) {
      throw new Error('Could not parse BCV rate from website.');
    }

    // --- Extracción y Parseo de la Fecha Valor ---
    const dateText = $('.pull-right span.date-display-single').first().text().trim();
    if (!dateText) {
      throw new Error('Could not find Fecha Valor on BCV website.');
    }

    const dateParts = dateText.split(' ').filter(Boolean); // Filtra elementos vacíos
    const day = parseInt(dateParts[1], 10);
    const monthStr = dateParts[2].toLowerCase();
    const year = parseInt(dateParts[3], 10);

    const months: { [key: string]: number } = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };

    const month = months[monthStr];

    if (isNaN(day) || isNaN(year) || month === undefined) {
      throw new Error(`Could not parse date from string: "${dateText}"`);
    }

    const fechaValor = new Date(Date.UTC(year, month, day));
    // console.log(`[BCV Cron] Step 2: Parsed 'Fecha Valor' from BCV website: ${fechaValor.toISOString()}`);

    // --- Lógica de Fechas para el Registro de Tasas (Idempotente) ---
    // console.log('[BCV Cron] Step 3: Determining fecha_inicio and fecha_fin for the new rate record based on clarified understanding...');
    
    const currentDateOnly = new Date();
    currentDateOnly.setUTCHours(0, 0, 0, 0); // Normalizar a medianoche UTC

    let fechaInicio: Date;
    const fechaFin: Date = fechaValor; // La fecha_fin es siempre la fecha_valor

    // Comparar solo las fechas (día, mes, año)
    const isSameDay = currentDateOnly.getFullYear() === fechaValor.getFullYear() &&
                      currentDateOnly.getMonth() === fechaValor.getMonth() &&
                      currentDateOnly.getDate() === fechaValor.getDate();

    if (isSameDay) {
      // console.log('[BCV Cron] Current run date is the same as fechaValor. fecha_inicio = fechaValor.');
      fechaInicio = fechaValor;
    } else {
      // Si currentDateOnly es diferente de fechaValor, y sabemos que fechaValor no es una fecha pasada,
      // entonces currentDateOnly debe ser ANTERIOR a fechaValor.
      // En este caso, la tasa inicia el día siguiente al que corrió el cron.
      // console.log('[BCV Cron] Current run date is different (earlier) from fechaValor. fecha_inicio = current_date + 1 day.');
      fechaInicio = new Date(currentDateOnly); // Crear una nueva instancia para evitar mutar
      fechaInicio.setUTCDate(fechaInicio.getUTCDate() + 1);
    }
    
    // console.log(`[BCV Cron] Calculated Dates for new record: fecha_inicio: ${fechaInicio.toISOString()}, fecha_fin: ${fechaFin.toISOString()}`);
    
    // --- Guardado en Base de Datos (Idempotente) ---
    // console.log(`[BCV Cron] Step 4: Upserting new rate into DB.`);
    const upsertData = {
      where: { fecha_efectiva: fechaValor },
      // Si ya existe un registro para esta fecha_efectiva, solo actualizamos la tasa.
      // Las fechas (inicio, fin) para una fecha_efectiva específica no deben cambiar después de su creación inicial.
      update: { 
        tasa: bcvRate,
      },
      // Si no existe un registro para esta fecha_efectiva, creamos uno nuevo.
      create: {
        tasa: bcvRate,
        fecha_efectiva: fechaValor,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      },
    };
    // console.log('[BCV Cron] DB-UPSERT Data:', JSON.stringify(upsertData, null, 2));

    await prisma.tasaBcv.upsert(upsertData);

    // console.log(`[BCV Cron] --- Finished. BCV rate updated in TasaBcv: ${bcvRate} for date ${fechaValor.toISOString()} ---`);
    return NextResponse.json({
      message: 'Scraping completado y guardado en TasaBcv',
      tasa_bcv: bcvRate,
      fecha_valor: fechaValor.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Error en el cron job de scraping:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  } finally {
    // Restaurar el comportamiento predeterminado después de la solicitud
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
  }
}
