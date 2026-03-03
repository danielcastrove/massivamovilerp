// massivamovilerp/src/app/api/customers/__tests__/route.test.ts
import { POST } from '../route';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import * as CustomerValidation from '@/lib/validations/customer';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
}));

// Mock '@/lib/db'
jest.mock('@/lib/db', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
    },
    parametro: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (callback) => {
      // For testing, we can pass the same mockPrisma as the transaction client
      return callback(mockPrisma);
    }),
  };
  return { prisma: mockPrisma };
});

// Mock the customerFormSchema module
jest.mock('@/lib/validations/customer', () => ({
  customerFormSchema: {
    safeParse: jest.fn(),
  },
  customerFormSchemaTransformed: {
    safeParse: jest.fn(),
  },
  formatPhoneNumberForSupabase: jest.fn((phone) => phone), // Simple passthrough for mock
}));

const mockAuth = auth as jest.Mock;
const mockCustomerFormSchema = CustomerValidation.customerFormSchema as jest.Mocked<typeof CustomerValidation.customerFormSchema>;
const mockCustomerFormSchemaTransformed = CustomerValidation.customerFormSchemaTransformed as jest.Mocked<typeof CustomerValidation.customerFormSchemaTransformed>;

describe('POST /api/customers', () => {
  const MOCK_ADMIN_SESSION = { user: { id: 'admin-id', email: 'admin@example.com', role: 'MASSIVA_ADMIN' } };
  const MOCK_CUSTOMER_SESSION = { user: { id: 'customer-id', email: 'customer@example.com', role: 'CLIENTE' } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create a mock Request object
  const createMockRequest = (body: any = {}, session: any = null) => {
    mockAuth.mockResolvedValue(session);
    return {
      json: () => Promise.resolve(body),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    };
  };

  const FULL_VALID_CUSTOMER_DATA = {
    useExistingUser: false,
    email: 'valid@example.com',
    taxIdPrefix: 'V',
    taxIdNumber: '123456789',
    businessName: 'Valid Company S.A.',
    phoneNumber: '1234567890',
    type: 'EMPRESA',
    priceListId: 'price-list-1',
    productId: 'product-1',
    telefono_celular: '9876543210',
    sitio_web: 'https://valid.com',
    email_user_masiva_SMS: 'sms@valid.com',
    email_user_masiva_whatsapp: 'whatsapp@valid.com',
    address: 'Some Address 123',
    ciudad: 'City',
    estado: 'State',
    pais: 'Country',
    codigo_postal: '12345',
    tipo_venta: 'MAYOR',
    figura_legal: 'PERSONA_JURIDICA',
    tipo_empresa: 'EMPRESA',
    is_agente_retencion: false,
    porcent_retencion_iva: 0,
    porcent_retencion_islr: 0,
    porcent_retencion_municipio: 0,
    fiscalAddress: 'Some Fiscal Address 456',
    persona_contacto_info: {
      nombre: 'Contact Name',
      email: 'contact@example.com',
      telefono: '1111111111',
      cargo: 'Manager'
    },
    persona_cobranza_info: {
      nombre: 'Billing Contact Name',
      email: 'billing@example.com',
      telefono: '2222222222',
      cargo: 'Billing Manager'
    },
    documento_constitutivo_info: {
      nombre_registro: 'Registro Mercantil',
      fecha_registro: '2020-01-01',
      nro_tomo: '1-A',
      email_registro: 'registro@example.com'
    },
    representante_legal_info: {
      nombre: 'Legal Rep Name',
      email: 'legal@example.com',
      cedulaPrefix: 'V',
      cedulaNumber: '12345678',
      telefonoNumber: '3333333333',
      cargo: 'Legal Representative'
    },
    // Simulated transformed fields
    doc_number: '123456789',
    tipo_doc_identidad: 'V',
  };


  it('should return 401 if no session is provided', async () => {
    const req = createMockRequest({});
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.message).toBe('Unauthorized');
  });

  it('should return 403 if user role is not admin or extra', async () => {
    const req = createMockRequest({}, MOCK_CUSTOMER_SESSION);
    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.message).toBe('Forbidden: Insufficient role permissions.');
  });

  it('should create a new customer and a new user if email does not exist', async () => {
    mockCustomerFormSchemaTransformed.safeParse.mockReturnValue({ success: true, data: FULL_VALID_CUSTOMER_DATA } as any);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'new-user-id', email: FULL_VALID_CUSTOMER_DATA.email });
    (prisma.customer.create as jest.Mock).mockResolvedValue({ id: 'new-customer-id', user_id: 'new-user-id', ...FULL_VALID_CUSTOMER_DATA });

    const req = createMockRequest(FULL_VALID_CUSTOMER_DATA, MOCK_ADMIN_SESSION);
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('id', 'new-customer-id');
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: FULL_VALID_CUSTOMER_DATA.email, role: 'CLIENTE' }),
      })
    );
    expect(prisma.customer.create).toHaveBeenCalled();
  });

  it('should create a new customer and link to an existing user if email exists and useExistingUser is true', async () => {
    const EXISTING_USER_ID = 'existing-user-id-abc';
    const mockCustomerData = {
      ...FULL_VALID_CUSTOMER_DATA,
      email: 'existing@example.com',
      useExistingUser: true,
      userId: EXISTING_USER_ID,
    };

    mockCustomerFormSchemaTransformed.safeParse.mockReturnValue({ success: true, data: mockCustomerData } as any);
    (prisma.customer.create as jest.Mock).mockResolvedValue({ id: 'new-customer-id-2', user_id: EXISTING_USER_ID, ...mockCustomerData });

    const req = createMockRequest(mockCustomerData, MOCK_ADMIN_SESSION);
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('id', 'new-customer-id-2');
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user: { connect: { id: EXISTING_USER_ID } },
        }),
      })
    );
  });

  it('should return 400 if doc_number is missing for new user creation when email is provided and useExistingUser is false', async () => {
    const customerDataWithoutDocNumber = {
      ...FULL_VALID_CUSTOMER_DATA,
      doc_number: undefined,
      tipo_doc_identidad: undefined,
    };

    mockCustomerFormSchemaTransformed.safeParse.mockReturnValue({ success: true, data: customerDataWithoutDocNumber } as any);

    const req = createMockRequest(customerDataWithoutDocNumber, MOCK_ADMIN_SESSION);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe('El número de documento (doc_number) es requerido para la creación de un nuevo usuario.');
  });
  
  it('should return 400 for validation errors from customerFormSchema', async () => {
    const mockZodError = {
      success: false,
      error: {
        flatten: () => ({
          fieldErrors: {
            email: ['Invalid email format'],
            businessName: ['Required'],
          },
        }),
      },
    };
    mockCustomerFormSchemaTransformed.safeParse.mockReturnValue(mockZodError as any);

    const invalidCustomerData = {
      ...FULL_VALID_CUSTOMER_DATA,
      email: 'invalid-email',
    };

    const req = createMockRequest(invalidCustomerData, MOCK_ADMIN_SESSION);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errors).toHaveProperty('email');
  });
});
