// massivamovilerp/src/app/api/cron/update-active-rate/__tests__/update-active-rate.test.ts

import { GET } from '../route';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
// No importar NextResponse directamente si se va a mockear por completo
// import { NextResponse } from 'next/server'; 

// Mockear módulos externos
jest.mock('@/lib/db', () => ({
  prisma: {
    tasaBcv: {
      findFirst: jest.fn(),
    },
    parametro: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}));

// Mockear el módulo 'next/server' completamente para controlar NextResponse
// Esto permite simular tanto new NextResponse() como NextResponse.json()
jest.mock('next/server', () => {
  // Define the behavior of the mocked NextResponse instances
  const createInstance = (body: any, options: { status?: number } = {}) => {
    // A simplified mock of the instance returned by NextResponse
    return {
      status: options.status || 200,
      json: jest.fn(() => Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body)),
      text: jest.fn(() => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body))),
      headers: new Headers(), // Minimal headers mock
    };
  };

  // Mock the NextResponse function/constructor itself
  // This handles `new NextResponse(...)` calls
  const NextResponseMock = jest.fn((body, options) => createInstance(body, options));

  // Attach the static `json` method to the mocked constructor/function
  // This handles `NextResponse.json(...)` calls
  NextResponseMock.json = jest.fn((data, options) => createInstance(data, options));

  return { NextResponse: NextResponseMock };
});

// Mockear console.error y console.warn para evitar ruido en los logs de prueba
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('GET /api/cron/update-active-rate', () => {
  const MOCK_ADMIN_EMAIL = 'admin@test.com';
  process.env.ADMIN_EMAIL = MOCK_ADMIN_EMAIL; // Asegurarse de que la variable de entorno esté configurada

  beforeEach(() => {
    jest.clearAllMocks();
    // Restaurar las implementaciones de los mocks para cada prueba si es necesario, o definir mocks específicos
    (prisma.tasaBcv.findFirst as jest.Mock).mockRestore();
    (prisma.parametro.upsert as jest.Mock).mockRestore();
    (sendEmail as jest.Mock).mockRestore();
    
    // As NextResponse is now a single mock function with a static method,
    // clearing its mock ensures clean state for each test.
    jest.mocked(require('next/server').NextResponse).mockClear();
    jest.mocked(require('next/server').NextResponse.json).mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  // --- Test de éxito ---
  test('should update active rate and send success email on successful execution', async () => {
    const mockTasaBcv = {
      tasa: 36.5,
      fecha_inicio: new Date('2025-12-17T00:00:00.000Z'),
      fecha_fin: new Date('2025-12-17T23:59:59.999Z'),
      fecha_efectiva: new Date('2025-12-17T00:00:00.000Z'),
    };

    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue(mockTasaBcv);
    (prisma.parametro.upsert as jest.Mock).mockResolvedValue({});
    (sendEmail as jest.Mock).mockResolvedValue('Email sent successfully');

    // La función GET importada ya usará el mock de NextResponse
    const response = await GET();
    const jsonResponse = await response.json(); // Ahora response debería tener el método json()

    expect(prisma.tasaBcv.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.parametro.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.parametro.upsert).toHaveBeenCalledWith({
      where: { key: 'tasa_bcv' },
      update: { value: mockTasaBcv.tasa.toString() },
      create: { key: 'tasa_bcv', value: mockTasaBcv.tasa.toString() },
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: MOCK_ADMIN_EMAIL,
        subject: 'Tasa de BCV Actualizada',
        html: expect.stringContaining(`<strong>Tasa:</strong> ${mockTasaBcv.tasa}`),
      })
    );
    expect(response.status).toBe(200);
    expect(jsonResponse.message).toBe('Parámetro de tasa_bcv actualizado con éxito.');
    expect(jsonResponse.tasa_activa).toBe(mockTasaBcv.tasa.toString());
  });

  // --- Test de fallo: No se encontró tasa activa ---
  test('should send failure email if no active rate is found', async () => {
    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue(null);
    (sendEmail as jest.Mock).mockResolvedValue('Email sent successfully');

    const response = await GET();
    const errorText = await response.text(); // Ahora response debería tener el método text()
    const jsonError = JSON.parse(errorText);

    expect(prisma.tasaBcv.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.parametro.upsert).not.toHaveBeenCalled(); // No debería intentar actualizar si no hay tasa
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: MOCK_ADMIN_EMAIL,
        subject: 'Error al Actualizar Tasa de BCV',
        html: expect.stringContaining('No se encontró una tasa de BCV activa'),
      })
    );
    expect(response.status).toBe(500);
    expect(jsonError.message).toBe('Error interno del servidor. Se envió correo de notificación.');
    expect(jsonError.error).toContain('No se encontró una tasa de BCV activa');
  });

  // --- Test de fallo: Error en la actualización de la BD (upsert) ---
  test('should send failure email if database upsert fails', async () => {
    const mockTasaBcv = {
      tasa: 36.5,
      fecha_inicio: new Date('2025-12-17T00:00:00.000Z'),
      fecha_fin: new Date('2025-12-17T23:59:59.999Z'),
      fecha_efectiva: new Date('2025-12-17T00:00:00.000Z'),
    };
    const dbError = new Error('Database connection lost');

    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue(mockTasaBcv);
    (prisma.parametro.upsert as jest.Mock).mockRejectedValue(dbError); // Simular fallo de BD
    (sendEmail as jest.Mock).mockResolvedValue('Email sent successfully');

    const response = await GET();
    const errorText = await response.text();
    const jsonError = JSON.parse(errorText);

    expect(prisma.tasaBcv.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.parametro.upsert).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: MOCK_ADMIN_EMAIL,
        subject: 'Error al Actualizar Tasa de BCV',
        html: expect.stringContaining('Database connection lost'),
      })
    );
    expect(response.status).toBe(500);
    expect(jsonError.message).toBe('Error interno del servidor. Se envió correo de notificación.');
    expect(jsonError.error).toContain('Database connection lost');
  });

  // --- Test de fallo: Fallo al enviar email de notificación de error ---
  test('should return internal server error if error email notification also fails', async () => {
    (prisma.tasaBcv.findFirst as jest.Mock).mockResolvedValue(null); // Provocar un error inicial
    const emailSendError = new Error('Email service down');
    (sendEmail as jest.Mock).mockRejectedValue(emailSendError); // Simular fallo en el envío del email de error

    const response = await GET();
    const errorText = await response.text();
    const jsonError = JSON.parse(errorText);

    expect(prisma.tasaBcv.findFirst).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1); // Debería intentar enviar el email de error
    expect(response.status).toBe(500);
    expect(jsonError.message).toBe('Error interno del servidor. Falló también el envío de correo de notificación.');
    expect(jsonError.error).toContain('No se encontró una tasa de BCV activa');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error enviando el correo de notificación de error:', emailSendError);
  });
});