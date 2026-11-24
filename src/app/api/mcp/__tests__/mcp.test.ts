import { handleMcpRequest } from '@/lib/mcp/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => {
  const mockPrisma = {
    apiKey: {
      findUnique: jest.fn(),
    },
    apiKeyRateLimit: {
      upsert: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    lead: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    productPrice: {
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  };
  return { prisma: mockPrisma };
});

const mockAuth = auth as jest.Mock;
const mockFindApiKey = prisma.apiKey.findUnique as jest.Mock;

const VALID_KEY = 'sk-' + 'b'.repeat(48);

const ACCEPT_HEADERS = 'application/json, text/event-stream';

function mcpRequest(body: unknown, apiKey?: string): Request {
  const headers: Record<string, string> = {
    accept: ACCEPT_HEADERS,
    'content-type': 'application/json',
  };
  if (apiKey) headers['x-api-key'] = apiKey;
  return new Request('https://example.com/api/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function initializeBody(id: number) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    },
  };
}

interface JsonRpcResponse {
  result: {
    serverInfo: { name: string };
    tools: Array<{ name: string; annotations?: { readOnlyHint?: boolean } }>;
    isError?: boolean;
    content: Array<{ type: string; text: string }>;
  };
  error?: { code: number; message: string };
}

async function readJson(res: Response): Promise<JsonRpcResponse> {
  const text = await res.text();
  return JSON.parse(text);
}

describe('POST /api/mcp — autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockFindApiKey.mockResolvedValue({
      id: 'key-1',
      is_active: true,
      expires_at: null,
      allowed_endpoints: ['GET:/api/customers/*'],
      rate_limit: null,
    });
  });

  it('responde 401 sin API key', async () => {
    const res = await handleMcpRequest(mcpRequest(initializeBody(1)));
    expect(res.status).toBe(401);
    const body = await readJson(res);
    expect(body.error).toBe('missing_api_key');
  });

  it('acepta la key en el header Authorization: Bearer', async () => {
    const req = new Request('https://example.com/api/mcp', {
      method: 'POST',
      headers: {
        accept: ACCEPT_HEADERS,
        'content-type': 'application/json',
        authorization: `Bearer ${VALID_KEY}`,
      },
      body: JSON.stringify(initializeBody(1)),
    });
    const res = await handleMcpRequest(req);
    expect(res.status).toBe(200);
  });

  it('responde 401 con API key inválida', async () => {
    mockFindApiKey.mockResolvedValue(null);
    const res = await handleMcpRequest(mcpRequest(initializeBody(1), VALID_KEY));
    expect(res.status).toBe(401);
    const body = await readJson(res);
    expect(body.error).toBe('invalid_api_key');
  });

  it('responde 401 con API key desactivada', async () => {
    mockFindApiKey.mockResolvedValue({
      id: 'key-1',
      is_active: false,
      expires_at: null,
      allowed_endpoints: [],
      rate_limit: null,
    });
    const res = await handleMcpRequest(mcpRequest(initializeBody(1), VALID_KEY));
    expect(res.status).toBe(401);
  });

  it('responde 401 con API key expirada', async () => {
    mockFindApiKey.mockResolvedValue({
      id: 'key-1',
      is_active: true,
      expires_at: new Date(Date.now() - 1000),
      allowed_endpoints: [],
      rate_limit: null,
    });
    const res = await handleMcpRequest(mcpRequest(initializeBody(1), VALID_KEY));
    expect(res.status).toBe(401);
  });

  it('inicializa el handshake MCP con serverInfo', async () => {
    const res = await handleMcpRequest(mcpRequest(initializeBody(1), VALID_KEY));
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.result.serverInfo.name).toBe('massivamovil-erp');
  });
});

describe('POST /api/mcp — tools/list y allowlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  async function listTools(endpoints: string[]): Promise<JsonRpcResponse['result']['tools']> {
    mockFindApiKey.mockResolvedValue({
      id: 'key-1',
      is_active: true,
      expires_at: null,
      allowed_endpoints: endpoints,
      rate_limit: null,
    });
    const res = await handleMcpRequest(
      mcpRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, VALID_KEY)
    );
    expect(res.status).toBe(200);
    const body = await readJson(res);
    return body.result.tools;
  }

  it('registra solo los tools de endpoints permitidos', async () => {
    const tools = await listTools([
      'GET:/api/customers/*',
      'GET:/api/invoices/*',
    ]);
    const names = tools.map((t) => t.name);
    expect(names).toContain('list_customers');
    expect(names).toContain('list_invoices');
    expect(names).not.toContain('list_products');
    expect(names).not.toContain('list_leads');
    expect(names).not.toContain('get_payment');
  });

  it('no registra ningún tool de escritura', async () => {
    const tools = await listTools([
      'GET:/api/customers/*',
      'POST:/api/customers/*',
      'PUT:/api/customers/*',
      'DELETE:/api/customers/*',
      'GET:/api/invoices/*',
      'POST:/api/invoices/*',
      'PUT:/api/invoices/*',
      'DELETE:/api/invoices/*',
      'GET:/api/products/*',
      'POST:/api/products/*',
      'GET:/api/payments/*',
      'POST:/api/payments/*',
      'DELETE:/api/payments/*',
      'GET:/api/leads/*',
      'POST:/api/leads/*',
      'PUT:/api/leads/*',
      'DELETE:/api/leads/*',
      'GET:/api/categories/*',
      'POST:/api/categories/*',
      'GET:/api/productprices/*',
      'POST:/api/productprices/*',
      'DELETE:/api/productprices/*',
    ]);
    const names = tools.map((t) => t.name);
    expect(new Set(names)).toEqual(
      new Set([
        'list_customers',
        'list_invoices',
        'list_products',
        'list_payments',
        'get_payment',
        'list_leads',
        'list_categories',
        'list_product_prices',
      ])
    );
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
  });

  it('registra 0 tools si la key no tiene endpoints GET', async () => {
    const tools = await listTools(['POST:/api/customers/*']);
    expect(tools).toHaveLength(0);
  });

  it('matchea también sin prefijo de método (formato legado)', async () => {
    const tools = await listTools(['/api/categories']);
    const names = tools.map((t) => t.name);
    expect(names).toContain('list_categories');
  });
});

describe('POST /api/mcp — tools/call', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockFindApiKey.mockResolvedValue({
      id: 'key-1',
      is_active: true,
      expires_at: null,
      allowed_endpoints: ['GET:/api/customers/*'],
      rate_limit: null,
    });
  });

  it('ejecuta list_customers y devuelve los datos', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([
      { id: 'c1', name: 'Cliente Uno' },
    ]);

    const res = await handleMcpRequest(
      mcpRequest(
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'list_customers', arguments: {} },
        },
        VALID_KEY
      )
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.result.isError).toBeFalsy();
    const text = body.result.content[0].text;
    expect(JSON.parse(text)).toEqual([{ id: 'c1', name: 'Cliente Uno' }]);
    expect(prisma.customer.findMany).toHaveBeenCalled();
  });

  it('devuelve isError si el handler responde con error HTTP', async () => {
    (prisma.customer.findMany as jest.Mock).mockRejectedValue(
      new Error('db failure')
    );

    const res = await handleMcpRequest(
      mcpRequest(
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: { name: 'list_customers', arguments: {} },
        },
        VALID_KEY
      )
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain('Error HTTP 500');
  });

  it('no permite ejecutar un tool no registrado en la allowlist', async () => {
    const res = await handleMcpRequest(
      mcpRequest(
        {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: { name: 'list_invoices', arguments: {} },
        },
        VALID_KEY
      )
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.result.isError).toBe(true);
    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/mcp — rate limit de mensajes de protocolo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockFindApiKey.mockResolvedValue({
      id: 'key-1',
      is_active: true,
      expires_at: null,
      allowed_endpoints: ['GET:/api/customers/*'],
      rate_limit: 5,
    });
    (prisma.apiKeyRateLimit.upsert as jest.Mock).mockResolvedValue({ count: 1 });
  });

  it('aplica rate limit al initialize (tools/list/init)', async () => {
    (prisma.apiKeyRateLimit.upsert as jest.Mock).mockResolvedValue({ count: 6 });

    const res = await handleMcpRequest(mcpRequest(initializeBody(1), VALID_KEY));
    expect(res.status).toBe(429);
    const body = await readJson(res);
    expect(body.error).toBe('rate_limited');
  });

  it('no aplica rate limit doble en tools/call (lo consume el handler)', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

    const upsert = prisma.apiKeyRateLimit.upsert as jest.Mock;
    upsert.mockClear();

    const res = await handleMcpRequest(
      mcpRequest(
        {
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: { name: 'list_customers', arguments: {} },
        },
        VALID_KEY
      )
    );

    expect(res.status).toBe(200);
    // Only the underlying route handler consumed the rate limit budget once
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
