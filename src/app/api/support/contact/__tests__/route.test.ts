import { POST } from '../route';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/notifications', () => ({ sendNotification: jest.fn() }));
jest.mock('@/lib/db', () => ({
  prisma: {
    customer: { findUnique: jest.fn() },
  },
}));

const mockAuth = auth as jest.Mock;
const mockSendNotification = sendNotification as jest.Mock;
const mockCustomerFindUnique = prisma.customer.findUnique as jest.Mock;

const SESSION = {
  user: { id: 'user-1', email: 'cliente@example.com', role: 'CLIENTE', roleDisplayName: 'Cliente' },
};

const CUSTOMER = { name: 'Empresa Demo C.A.', doc_number: 'J-12345678-9' };

const createRequest = (body: unknown) =>
  ({ json: () => Promise.resolve(body) }) as unknown as NextRequest;

describe('POST /api/support/contact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(SESSION);
    mockCustomerFindUnique.mockResolvedValue(CUSTOMER);
    mockSendNotification.mockResolvedValue('ok');
  });

  it('devuelve 401 sin sesión', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest({ channel: 'EMAIL', message: 'hola', subject: 'x' }));
    expect(res.status).toBe(401);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('devuelve 400 con canal inválido', async () => {
    const res = await POST(createRequest({ channel: 'TELEPATA', message: 'hola' }));
    expect(res.status).toBe(400);
  });

  it('devuelve 400 sin mensaje', async () => {
    const res = await POST(createRequest({ channel: 'SMS', message: '' }));
    expect(res.status).toBe(400);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('devuelve 400 en EMAIL sin asunto', async () => {
    const res = await POST(createRequest({ channel: 'EMAIL', message: 'hola' }));
    expect(res.status).toBe(400);
  });

  it('envía EMAIL al soporte (fallback josedelgadoyepez@gmail.com) con plantilla de marca y contexto', async () => {
    const res = await POST(
      createRequest({
        channel: 'EMAIL',
        message: 'Tengo una consulta con mi factura',
        subject: 'Consulta factura',
        invoiceNumber: 42,
      })
    );

    expect(res.status).toBe(200);
    expect(mockCustomerFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 'user-1' } })
    );

    const arg = mockSendNotification.mock.calls[0][0];
    expect(arg.type).toBe('EMAIL');
    expect(arg.to).toBe('josedelgadoyepez@gmail.com'); // fallback sin env var
    expect(arg.subject).toBe('Consulta factura');
    expect(arg.message).toContain('massivamovil.png'); // plantilla institucional
    expect(arg.message).toContain('Empresa Demo C.A.'); // contexto resuelto del servidor
    expect(arg.message).toContain('J-12345678-9');
    expect(arg.message).toContain('#000042');
    expect(arg.message).toContain('Tengo una consulta con mi factura');
  });

  it('envía SMS al soporte con formato internacional +58 y contexto compacto', async () => {
    const res = await POST(
      createRequest({ channel: 'SMS', message: 'Necesito ayuda', invoiceNumber: 7 })
    );

    expect(res.status).toBe(200);
    const arg = mockSendNotification.mock.calls[0][0];
    expect(arg.type).toBe('SMS');
    // La API de SMS falla con el 0 inicial: debe viajar como +58414...
    expect(arg.to).toBe('+584142768598');
    expect(arg.message).toContain('Necesito ayuda');
    expect(arg.message).toContain('Fact. Nro 000007'); // contexto compacto (sin #, la API lo elimina)
    expect(arg.message.length).toBeLessThanOrEqual(160);
  });

  it('rechaza SMS cuyo mensaje + contexto exceda 160 caracteres', async () => {
    const res = await POST(
      createRequest({ channel: 'SMS', message: 'x'.repeat(200) })
    );
    expect(res.status).toBe(400);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('usa el nombre del body como respaldo si no hay customer vinculado', async () => {
    mockCustomerFindUnique.mockResolvedValue(null);
    const res = await POST(
      createRequest({
        channel: 'WHATSAPP',
        message: 'Hola soporte',
        customerName: 'Cliente Sin Vincular',
        customerDoc: 'V-99999999',
      })
    );

    expect(res.status).toBe(200);
    const arg = mockSendNotification.mock.calls[0][0];
    expect(arg.type).toBe('WHATSAPP');
    expect(arg.to).toBe('+584142768598'); // formato internacional
    expect(arg.message).toContain('Cliente Sin Vincular');
    expect(arg.message).toContain('V-99999999');
  });

  it('devuelve 500 si el envío falla', async () => {
    mockSendNotification.mockResolvedValue(null);
    const res = await POST(createRequest({ channel: 'SMS', message: 'hola' }));
    expect(res.status).toBe(500);
  });

  it('devuelve 500 si la API de SMS responde con error (no success)', async () => {
    // sendSmsMassiva devuelve el objeto de error en vez de null
    mockSendNotification.mockResolvedValue({ error: 'Numero invalido', status: '0' });
    const res = await POST(createRequest({ channel: 'SMS', message: 'hola' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toContain('SMS');
  });

  it('acepta el éxito de la API de SMS (status > 0)', async () => {
    mockSendNotification.mockResolvedValue({ status: '1', mensaje: 'ok' });
    const res = await POST(createRequest({ channel: 'SMS', message: 'hola' }));
    expect(res.status).toBe(200);
  });

  it('devuelve 500 si la API de WhatsApp responde con error', async () => {
    mockSendNotification.mockResolvedValue({ status: 401, error: 'unauthorized' });
    const res = await POST(createRequest({ channel: 'WHATSAPP', message: 'hola' }));
    expect(res.status).toBe(500);
  });
});
