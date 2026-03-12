
import { prisma } from '../src/lib/db.js';
import { GET } from '../src/app/api/cron/update-active-rate/route.js';
import axios from 'axios';

// Helper para crear el HTML del BCV
const createMockHtml = (rate: string, date: string): string => `
  <html>
    <body>
      <div id="dolar"><strong>${rate}</strong></div>
      <div class="pull-right"><span class="date-display-single">${date}</span></div>
    </body>
  </html>
`;

const originalAxiosGet = axios.get;
axios.get = jest.fn() as any;

async function runTests() {
  console.log('--- INICIANDO PRUEBAS DE LÓGICA DE GAPS (update-active-rate) ---');

  // 1. ESCENARIO: FIN DE SEMANA
  console.log('\nTEST 1: Salto de Viernes a Lunes (Fin de Semana)');
  await prisma.tasaBcv.deleteMany({});
  
  // Guardamos tasa del Viernes 06 de Marzo
  const viernes = new Date(Date.UTC(2026, 2, 6));
  await prisma.tasaBcv.create({
    data: {
      tasa: 36.00,
      fecha_efectiva: viernes,
      fecha_inicio: viernes,
      fecha_fin: viernes,
    }
  });
  console.log('Viernes 06/03 registrado.');

  // Simulamos que el BCV publica la tasa del Lunes 09 de Marzo
  (axios.get as jest.Mock).mockResolvedValue({ 
    data: createMockHtml('36,5000', 'Lunes 09 Marzo 2026') 
  });

  await GET();

  const rates1 = await prisma.tasaBcv.findMany({ orderBy: { fecha_efectiva: 'asc' } });
  console.log('Resultado esperado: La tasa del Lunes debe iniciar el Sábado 07/03');
  console.table(rates1.map(r => ({
    valor: r.tasa.toString(),
    efectiva: r.fecha_efectiva.toISOString().split('T')[0],
    inicio: r.fecha_inicio.toISOString().split('T')[0],
    fin: r.fecha_fin?.toISOString().split('T')[0]
  })));

  // 2. ESCENARIO: FERIADO LARGO (Semana Santa)
  console.log('\nTEST 2: Salto de Miércoles a Lunes (Semana Santa)');
  await prisma.tasaBcv.deleteMany({});

  // Miércoles de Ceniza/Santo
  const miercoles = new Date(Date.UTC(2026, 3, 1)); 
  await prisma.tasaBcv.create({
    data: {
      tasa: 37.00,
      fecha_efectiva: miercoles,
      fecha_inicio: miercoles,
      fecha_fin: miercoles,
    }
  });

  // BCV publica el Lunes después del feriado
  (axios.get as jest.Mock).mockResolvedValue({ 
    data: createMockHtml('37,8000', 'Lunes 06 Abril 2026') 
  });

  await GET();

  const rates2 = await prisma.tasaBcv.findMany({ orderBy: { fecha_efectiva: 'asc' } });
  console.log('Resultado esperado: La tasa del Lunes debe iniciar el Jueves 02/04');
  console.table(rates2.map(r => ({
    valor: r.tasa.toString(),
    efectiva: r.fecha_efectiva.toISOString().split('T')[0],
    inicio: r.fecha_inicio.toISOString().split('T')[0],
    fin: r.fecha_fin?.toISOString().split('T')[0]
  })));
}

runTests()
  .catch(console.error)
  .finally(async () => {
    axios.get = originalAxiosGet;
    await prisma.$disconnect();
  });
