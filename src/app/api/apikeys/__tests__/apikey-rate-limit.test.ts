import { withApiKeyAuth } from '@/lib/apikey-guard';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    apiKey: {
      findUnique: jest.fn(),
    },
    apiKeyRateLimit: {
      upsert: jest.fn(),
    },
  },
}));

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.apiKey.findUnique as jest.Mock;
const mockUpsert = prisma.apiKeyRateLimit.upsert as jest.Mock;

const VALID_KEY = 'sk-' + 'a'.repeat(48);

function makeRequest(path = '/api/customers') {
  return new Request(`https://example.com${path}`, {
    method: 'GET',
    headers: { 'x-api-key': VALID_KEY },
  });
}

function okHandler() {
  return jest.fn(async () => NextResponse.json({ ok: true }));
}

describe('withApiKeyAuth — rate limit persistente', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue({
      id: 'key-1',
      is_active: true,
      expires_at: null,
      allowed_endpoints: ['GET:/api/customers/*'],
      rate_limit: 2,
    });
    // Default: upsert returns count 1 (first request in window)
    mockUpsert.mockResolvedValue({ count: 1 });
  });

  it('permite requests dentro del límite', async () => {
    const handler = okHandler();
    const res = await withApiKeyAuth(makeRequest(), handler);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { count: { increment: 1 } },
      })
    );
  });

  it('responde 429 cuando el contador de la ventana supera el límite', async () => {
    mockUpsert.mockResolvedValue({ count: 3 }); // limit = 2

    const handler = okHandler();
    const res = await withApiKeyAuth(makeRequest(), handler);

    expect(res.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });

  it('no aplica rate limit si la key no tiene rate_limit', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'key-1',
      is_active: true,
      expires_at: null,
      allowed_endpoints: ['GET:/api/customers/*'],
      rate_limit: null,
    });

    const handler = okHandler();
    const res = await withApiKeyAuth(makeRequest(), handler);

    expect(res.status).toBe(200);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('falla abierto si la tabla de rate limit no está disponible', async () => {
    mockUpsert.mockRejectedValue(new Error('db down'));

    const handler = okHandler();
    const res = await withApiKeyAuth(makeRequest(), handler);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('usa ventanas fijas de 60 segundos', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_123_456);

    const handler = okHandler();
    await withApiKeyAuth(makeRequest(), handler);

    const expectedWindow = new Date(Math.floor(1_700_000_123_456 / 60_000) * 60_000);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          key_id_window_start: { key_id: 'key-1', window_start: expectedWindow },
        },
      })
    );

    nowSpy.mockRestore();
  });

  it('rechaza endpoint no permitido antes de contar el rate limit', async () => {
    const handler = okHandler();
    const res = await withApiKeyAuth(makeRequest('/api/invoices'), handler);

    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('devuelve 401 si no hay key', async () => {
    const req = new Request('https://example.com/api/customers');
    const handler = okHandler();
    const res = await withApiKeyAuth(req, handler);

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('devuelve 401 si la key es inválida', async () => {
    mockFindUnique.mockResolvedValue(null);

    const handler = okHandler();
    const res = await withApiKeyAuth(makeRequest(), handler);

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});
