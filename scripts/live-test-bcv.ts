
import { prisma } from '../src/lib/db';
import { GET } from '../src/app/api/cron/bcv/route';
import axios from 'axios';

// Helper to create a mock HTML response for axios
const createMockHtml = (rate: string, date: string): string => `
  <html>
    <body>
      <div id="dolar">
        <strong>${rate}</strong>
      </div>
      <div class="pull-right">
        <span class="date-display-single">${date}</span>
      </div>
    </body>
  </html>
`;

// --- Monkey-patching axios ---
// We store the original GET function
const originalAxiosGet = axios.get;
// We define a type for our mock function
type AxiosMock = (html: string) => void;

// This function allows us to set the mock response for the next axios.get call
const setAxiosMock: AxiosMock = (html) => {
  (axios.get as jest.Mock) = jest.fn().mockResolvedValue({ data: html });
};

// We need to define axios.get as a mock function from jest
axios.get = jest.fn();

// Main function to run the tests
async function runLiveTests() {
  console.log('--- INICIANDO PRUEBAS "EN VIVO" DEL CRON JOB BCV ---');

  // Scenario 1: Normal Day-to-Day
  await testNormalDay();

  // Scenario 2: Weekend Gap
  await testWeekend();

  // Scenario 3: Extended Holiday (Semana Santa)
  await testSemanaSanta();

  console.log('--- PRUEBAS "EN VIVO" COMPLETADAS ---');
}

async function testNormalDay() {
  console.log('\n--- ESCENARIO 1: DÍA A DÍA NORMAL ---');
  await prisma.tasaBcv.deleteMany({});
  console.log('1. DB Limpia.');

  const prevDate = new Date(Date.UTC(2025, 3, 16)); // April 16
  await prisma.tasaBcv.create({
    data: {
      tasa: 36.0,
      fecha_efectiva: prevDate,
      fecha_inicio: prevDate,
      fecha_fin: prevDate,
    },
  });
  console.log('2. Tasa anterior creada para el día 16/04/2025.');

  const mockHtml = createMockHtml('36,1234', 'Jueves 17 Abril 2025');
  setAxiosMock(mockHtml);
  console.log('3. Mock de BCV preparado para devolver tasa del 17/04/2025.');

  console.log('4. Ejecutando lógica del cron...');
  await GET();

  const results = await prisma.tasaBcv.findMany({ orderBy: { fecha_inicio: 'asc' } });
  console.log('5. Resultado en DB:');
  console.table(results.map(r => ({ ...r, tasa: r.tasa.toString() })));
}

async function testWeekend() {
  console.log('\n--- ESCENARIO 2: FIN DE SEMANA ---');
  await prisma.tasaBcv.deleteMany({});
  console.log('1. DB Limpia.');

  const prevDate = new Date(Date.UTC(2025, 3, 18)); // Friday, April 18
  await prisma.tasaBcv.create({
    data: {
      tasa: 36.1234,
      fecha_efectiva: prevDate,
      fecha_inicio: prevDate,
      fecha_fin: prevDate,
    },
  });
  console.log('2. Tasa anterior creada para el Viernes 18/04/2025.');

  const mockHtml = createMockHtml('36,2345', 'Lunes 21 Abril 2025');
  setAxiosMock(mockHtml);
  console.log('3. Mock de BCV preparado para devolver tasa del Lunes 21/04/2025.');

  console.log('4. Ejecutando lógica del cron...');
  await GET();

  const results = await prisma.tasaBcv.findMany({ orderBy: { fecha_inicio: 'asc' } });
  console.log('5. Resultado en DB:');
  console.table(results.map(r => ({ ...r, tasa: r.tasa.toString() })));
}

async function testSemanaSanta() {
  console.log('\n--- ESCENARIO 3: SEMANA SANTA (FERIADO LARGO) ---');
  await prisma.tasaBcv.deleteMany({});
  console.log('1. DB Limpia.');

  // Last working day before holiday is Wednesday
  const prevDate = new Date(Date.UTC(2025, 3, 16)); // Wednesday, April 16
  await prisma.tasaBcv.create({
    data: {
      tasa: 36.1,
      fecha_efectiva: prevDate,
      fecha_inicio: prevDate,
      fecha_fin: prevDate,
    },
  });
  console.log('2. Tasa anterior creada para el Miércoles 16/04/2025.');

  // Next rate is published on Monday after the holiday
  const mockHtml = createMockHtml('36,3456', 'Lunes 21 Abril 2025');
  setAxiosMock(mockHtml);
  console.log('3. Mock de BCV preparado para devolver tasa del Lunes 21/04/2025.');
  
  console.log('4. Ejecutando lógica del cron...');
  await GET();

  const results = await prisma.tasaBcv.findMany({ orderBy: { fecha_inicio: 'asc' } });
  console.log('5. Resultado en DB:');
  console.table(results.map(r => ({ ...r, tasa: r.tasa.toString() })));
}

runLiveTests()
  .catch((e) => {
    console.error('Una de las pruebas en vivo falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Restore original axios.get
    axios.get = originalAxiosGet;
    await prisma.$disconnect();
  });
