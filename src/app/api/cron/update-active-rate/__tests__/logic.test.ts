
import { GET } from '../route';
import { prisma } from '@/lib/db';
import axios from 'axios';
import { sendEmail } from '@/lib/email';

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue('http://preview.url'),
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const createMockHtml = (rate: string, date: string): string => `
  <html>
    <body>
      <div id="dolar"><strong>${rate}</strong></div>
      <div class="pull-right"><span class="date-display-single">${date}</span></div>
    </body>
  </html>
`;

describe('Lógica de Gaps y Resiliencia en update-active-rate', () => {
  const adminEmail = 'admin@test.com';

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.tasaBcv.deleteMany({});
    process.env.ADMIN_EMAIL = adminEmail;
  });

  test('debe cubrir el fin de semana (Viernes -> Lunes)', async () => {
    const viernes = new Date(Date.UTC(2026, 2, 6)); // Viernes 6 Marzo
    await prisma.tasaBcv.create({
      data: {
        tasa: 36.00,
        fecha_efectiva: viernes,
        fecha_inicio: viernes,
        fecha_fin: viernes,
      }
    });

    mockedAxios.get.mockResolvedValue({ 
      data: createMockHtml('36,5000', 'Lunes 09 Marzo 2026') 
    });

    await GET();

    const rates = await prisma.tasaBcv.findMany({ orderBy: { fecha_efectiva: 'asc' } });
    const lunesRate = rates.find(r => r.fecha_efectiva.getUTCDate() === 9);
    
    // Verificamos que el Sábado 7 esté cubierto
    expect(lunesRate?.fecha_inicio.getUTCDate()).toBe(7); 
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining('36,5000'),
    }));
  });

  test('Resiliencia: debe usar tasa vigente si el scraping falla', async () => {
    const hoy = new Date();
    hoy.setUTCHours(0,0,0,0);
    
    // Guardamos una tasa que ya cubre hoy
    await prisma.tasaBcv.create({
      data: {
        tasa: 38.00,
        fecha_efectiva: new Date(hoy.getTime() - 86400000), // Ayer
        fecha_inicio: new Date(hoy.getTime() - 86400000),
        fecha_fin: new Date(Date.UTC(2099, 11, 31)), // Vigente
      }
    });

    // Simulamos que el BCV falla
    mockedAxios.get.mockRejectedValue(new Error('Portal Caído'));

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.message).toContain('Usando tasa vigente');
    // Verificamos que se mandó el correo de éxito (isFallback = true)
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining('38,0000'),
    }));
  });

  test('Error Crítico: debe fallar si no hay web ni base de datos', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Portal Caído'));

    const response = await GET();
    expect(response.status).toBe(500);
    
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining('Error Crítico'),
    }));
  });
});
