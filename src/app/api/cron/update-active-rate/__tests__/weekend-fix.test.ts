
import { GET } from '../route';
import { prisma } from '@/lib/db';
import axios from 'axios';
import { sendEmail } from '@/lib/email';

// Mockear Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    tasaBcv: {
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    parametro: {
      upsert: jest.fn(),
    },
  },
}));

// Mockear Email
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue('ok'),
}));

// Mockear Axios
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

describe('Prueba de Corrección: Fechas de Fin de Semana y Email (Mocks)', () => {
  const adminEmail = 'admin@test.com';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_EMAIL = adminEmail;
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  });

  test('Caso de Fin de Semana: La tasa del Lunes debe cubrir desde el Sábado y el email debe mostrar la fecha correcta', async () => {
    // 1. Setup Mock: Tasa del Viernes 6 de Marzo
    const viernes = new Date(Date.UTC(2026, 2, 6));
    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue({
      id: 'uuid-viernes',
      tasa: 36.00,
      fecha_efectiva: viernes,
      fecha_inicio: viernes,
      fecha_fin: viernes,
    });

    // 2. Setup Mock: Respuesta del BCV (Lunes 9 de Marzo)
    mockedAxios.get.mockResolvedValue({ 
      data: createMockHtml('36,5000', 'Lunes 09 Marzo 2026') 
    });

    // 3. Setup Mock: Simular Upsert exitoso
    const fechaLunes = new Date(Date.UTC(2026, 2, 9));
    const fechaSabado = new Date(Date.UTC(2026, 2, 7));
    (prisma.tasaBcv.upsert as jest.Mock).mockResolvedValue({
      tasa: 36.5,
      fecha_efectiva: fechaLunes,
      fecha_inicio: fechaSabado, // El inicio que esperamos
      fecha_fin: new Date(Date.UTC(2099, 11, 31)),
    });

    // 4. Ejecutar Cron
    const response = await GET();
    expect(response.status).toBe(200);

    // 5. Verificar que se actualizó el Viernes para cerrar el gap
    expect(prisma.tasaBcv.update).toHaveBeenCalled();

    // 6. Verificar que la nueva tasa empieza el Sábado 7
    expect(prisma.tasaBcv.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        fecha_inicio: fechaSabado,
        fecha_efectiva: fechaLunes
      })
    }));

    // 7. VERIFICACIÓN DEL CORREO
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Válida hasta:</strong> 2026-03-09')
    }));
  });

  test('Caso Fallback: Si el scraping falla, se usa la tasa vigente y el email muestra fechas coherentes', async () => {
    // 1. Mock: Scraping falla
    mockedAxios.get.mockRejectedValue(new Error('BCV Offline'));

    // 2. Setup Mock: Tasa vigente en DB
    const hoy = new Date();
    hoy.setUTCHours(0,0,0,0);
    // Usamos una fecha fija para el test para evitar problemas de zona horaria al comparar strings
    const fechaEfectivaOriginal = new Date(Date.UTC(2026, 2, 14)); 

    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue({
      id: 'uuid-vigente',
      tasa: 38.00,
      fecha_efectiva: fechaEfectivaOriginal,
      fecha_inicio: fechaEfectivaOriginal,
      fecha_fin: new Date(Date.UTC(2099, 11, 31)),
    });

    // 3. Ejecutar Cron
    const response = await GET();
    expect(response.status).toBe(200);

    // 4. Verificar el correo de Fallback (Vigente)
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining('Tasa BCV: 38,0000 Bs.'),
      html: expect.stringContaining('Tasa BCV Vigente') // El texto está en el HTML
    }));

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Válida hasta:</strong> 2026-03-14')
    }));
  });
});
