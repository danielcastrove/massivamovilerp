// massivamovilerp/src/app/api/customers/__tests__/route.test.ts
import { POST } from '../route';
// import { NextRequest } from 'next/server'; // No longer importing NextRequest directly
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as CustomerValidation from '@/lib/validations/customer'; // Import the module

// Define mock functions for Prisma client operations
const mockUserFindUnique = jest.fn();
const mockUserCreate = jest.fn();
const mockCustomerCreate = jest.fn();
const mockPrismaParametroFindUnique = jest.fn(); // Also mock parametro for cron tests later

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
}));

// Mock '@/lib/db' to return specific mock functions
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
    customer: {
      create: mockCustomerCreate,
    },
    parametro: {
      findUnique: mockPrismaParametroFindUnique,
    },
    $transaction: jest.fn(async (callback) => {
      // The `tx` object passed to the transaction callback should use these same mock functions
      const tx = {
        user: {
          findUnique: mockUserFindUnique,
          create: mockUserCreate,
        },
        customer: {
          create: mockCustomerCreate,
        },
        parametro: {
            findUnique: mockPrismaParametroFindUnique,
        },
      };
      return callback(tx);
    }),
  },
}));

// Get references to the mocked modules
const mockAuth = require('@/lib/auth').auth;
const mockPrisma = require('@/lib/db').prisma;

// Mock the customerFormSchema module
jest.mock('@/lib/validations/customer', () => ({
  customerFormSchema: {
    safeParse: jest.fn(),
  },
  customerFormSchemaTransformed: { // Add mock for the transformed schema
    safeParse: jest.fn(),
  },
}));
const mockCustomerFormSchema = CustomerValidation.customerFormSchema as jest.Mocked<typeof CustomerValidation.customerFormSchema>;
const mockCustomerFormSchemaTransformed = CustomerValidation.customerFormSchemaTransformed as jest.Mocked<typeof CustomerValidation.customerFormSchemaTransformed>;


describe('POST /api/customers', () => {
  const MOCK_ADMIN_SESSION = { user: { id: 'admin-id', email: 'admin@example.com', role: 'MASSIVA_ADMIN' } };
  const MOCK_CUSTOMER_SESSION = { user: { id: 'customer-id', email: 'customer@example.com', role: 'CLIENTE' } };

  beforeEach(() => {
    jest.clearAllMocks(); // Clears all mocks that are Jest spy functions.
    // Explicitly clear mocks for specific Jest functions if jest.clearAllMocks() doesn't cover them.
    mockUserFindUnique.mockClear();
    mockUserCreate.mockClear();
    mockCustomerCreate.mockClear();
    mockPrisma.user.findUnique.mockClear(); // Clear the mock on the mockPrisma object itself
    mockPrisma.user.create.mockClear();
    mockPrisma.customer.create.mockClear();
    mockPrisma.parametro.findUnique.mockClear();
    mockPrisma.$transaction.mockClear();

    mockCustomerFormSchema.safeParse.mockClear(); 
    mockCustomerFormSchemaTransformed.safeParse.mockClear(); 
  });

  // Helper to create a mock Request object
  const createMockRequest = (body: any = {}, session: any = null) => {
    mockAuth.mockResolvedValue(session);
    return {
      json: () => Promise.resolve(body),
      headers: new Headers({ 'Content-Type': 'application/json' }),
      // Add other properties that might be accessed by the handler if needed
    };
  };

  const FULL_VALID_CUSTOMER_DATA = {
    useExistingUser: false,
    email: 'valid@example.com',
    taxIdPrefix: 'V',
    taxIdNumber: '123456789',
    businessName: 'Valid Company S.A.', // Changed to businessName
    phoneNumber: '1234567890', // Changed to phoneNumber
    type: 'EMPRESA', // Now included and handled by transformed schema
    priceListId: 'price-list-1',
    productId: 'product-1',
    telefono_celular: '9876543210',
    sitio_web: 'https://valid.com',
    email_user_masiva_SMS: 'sms@valid.com',
    email_user_masiva_whatsapp: 'whatsapp@valid.com',
    address: 'Some Address 123', // Changed to address
    ciudad: 'City',
    estado: 'State',
    pais: 'Country',
    codigo_postal: '12345',
    tipo_venta: 'MAYOR', // Corrected enum value
    figura_legal: 'PERSONA_JURIDICA', // Corrected enum value
    tipo_empresa: 'EMPRESA', // Corrected enum value
    is_agente_retencion: false,
    porcent_retencion_iva: 0,
    porcent_retencion_islr: 0,
    porcent_retencion_municipio: 0,
    fiscalAddress: 'Some Fiscal Address 456', // Assuming it maps from address, or is a separate field
    persona_contacto_info: {
      nombre: 'Contact Name',
      email: 'contact@example.com',
      telefono: '1111111111',
      cargo: 'Manager'
    },
    persona_cobranza_info: { // These need to be present even if sameAsContact is true for the schema
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
    // The following fields might be implicitly handled by `customerFormSchemaTransformed`
    // name: 'Valid Company S.A.', // This will be derived from businessName
    // telefono_empresa: '1234567890', // This will be derived from phoneNumber
    // doc_number will be derived from taxIdPrefix and taxIdNumber
  };


  it('should return 401 if no session is provided', async () => {
    const req = createMockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.message).toBe('Unauthorized');
  });

  it('should return 403 if user role is not admin or extra', async () => {
    const req = createMockRequest({}, MOCK_CUSTOMER_SESSION);
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.message).toBe('Forbidden: Insufficient role permissions.');
  });

  it('should create a new customer and a new user if email does not exist', async () => {
    mockCustomerFormSchemaTransformed.safeParse.mockReturnValue({ success: true, data: FULL_VALID_CUSTOMER_DATA });
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'new-user-id', email: FULL_VALID_CUSTOMER_DATA.email }),
        },
        customer: {
          create: jest.fn().mockResolvedValue({ id: 'new-customer-id', user_id: 'new-user-id', ...FULL_VALID_CUSTOMER_DATA }),
        },
      };
      return callback(tx);
    });

    const req = createMockRequest(FULL_VALID_CUSTOMER_DATA, MOCK_ADMIN_SESSION);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('id', 'new-customer-id');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { email: FULL_VALID_CUSTOMER_DATA.email, password_hash: 'hashed_V-123456789', role: 'CLIENTE' },
      })
    );
    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: FULL_VALID_CUSTOMER_DATA.businessName, // Name is derived from businessName
          doc_number: `${FULL_VALID_CUSTOMER_DATA.taxIdPrefix}-${FULL_VALID_CUSTOMER_DATA.taxIdNumber}`,
          email: FULL_VALID_CUSTOMER_DATA.email,
          telefono_empresa: FULL_VALID_CUSTOMER_DATA.phoneNumber, // telefono_empresa is derived from phoneNumber
          telefono_celular: FULL_VALID_CUSTOMER_DATA.telefono_celular,
          sitio_web: FULL_VALID_CUSTOMER_DATA.sitio_web,
          email_user_masiva_SMS: FULL_VALID_CUSTOMER_DATA.email_user_masiva_SMS,
          email_user_masiva_whatsapp: FULL_VALID_CUSTOMER_DATA.email_user_masiva_whatsapp,
          direccion_fiscal: FULL_VALID_CUSTOMER_DATA.address,
          ciudad: FULL_VALID_CUSTOMER_DATA.ciudad,
          estado: FULL_VALID_CUSTOMER_DATA.estado,
          pais: FULL_VALID_CUSTOMER_DATA.pais,
          codigo_postal: FULL_VALID_CUSTOMER_DATA.codigo_postal,
          tipo_venta: FULL_VALID_CUSTOMER_DATA.tipo_venta,
          figura_legal: FULL_VALID_CUSTOMER_DATA.figura_legal,
          tipo_empresa: FULL_VALID_CUSTOMER_DATA.tipo_empresa,
          is_agente_retencion: FULL_VALID_CUSTOMER_DATA.is_agente_retencion,
          porcent_retencion_iva: FULL_VALID_CUSTOMER_DATA.porcent_retencion_iva,
          porcent_retencion_islr: FULL_VALID_CUSTOMER_DATA.porcent_retencion_islr,
          porcent_retencion_municipio: FULL_VALID_CUSTOMER_DATA.porcent_retencion_municipio,
          fiscalAddress: FULL_VALID_CUSTOMER_DATA.fiscalAddress,
          persona_contacto_info: FULL_VALID_CUSTOMER_DATA.persona_contacto_info,
          persona_cobranza_info: FULL_VALID_CUSTOMER_DATA.persona_cobranza_info,
          documento_constitutivo_info: FULL_VALID_CUSTOMER_DATA.documento_constitutivo_info,
          representante_legal_info: FULL_VALID_CUSTOMER_DATA.representante_legal_info,
          priceList: { connect: { id: FULL_VALID_CUSTOMER_DATA.priceListId } },
          product: { connect: { id: FULL_VALID_CUSTOMER_DATA.productId } },
          type: FULL_VALID_CUSTOMER_DATA.type,
          user: { connect: { id: 'new-user-id' } },
        }),
      })
    );
  });

  it('should create a new customer and link to an existing user if email exists', async () => {
    const EXISTING_USER_ID = 'existing-user-id-abc';
    const mockCustomerData = {
      ...FULL_VALID_CUSTOMER_DATA,
      email: 'existing@example.com',
    };

    mockCustomerFormSchemaTransformed.safeParse.mockReturnValue({ success: true, data: mockCustomerData });
    mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
            user: {
                findUnique: jest.fn().mockResolvedValue({ id: EXISTING_USER_ID, email: mockCustomerData.email }), // Existing user found
                create: jest.fn(), // Should not be called
            },
            customer: {
                create: jest.fn().mockResolvedValue({ id: 'new-customer-id-2', user_id: EXISTING_USER_ID, ...mockCustomerData }),
            },
        };
        return callback(tx);
    });

    const req = createMockRequest(mockCustomerData, MOCK_ADMIN_SESSION);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('id', 'new-customer-id-2');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: mockCustomerData.businessName, // Name is derived from businessName
          doc_number: `${mockCustomerData.taxIdPrefix}-${mockCustomerData.taxIdNumber}`,
          email: mockCustomerData.email,
          telefono_empresa: mockCustomerData.phoneNumber, // telefono_empresa is derived from phoneNumber
          telefono_celular: mockCustomerData.telefono_celular,
          sitio_web: mockCustomerData.sitio_web,
          email_user_masiva_SMS: mockCustomerData.email_user_masiva_SMS,
          email_user_masiva_whatsapp: mockCustomerData.email_user_masiva_whatsapp,
          direccion_fiscal: mockCustomerData.address,
          ciudad: mockCustomerData.ciudad,
          estado: mockCustomerData.estado,
          pais: mockCustomerData.pais,
          codigo_postal: mockCustomerData.codigo_postal,
          tipo_venta: mockCustomerData.tipo_venta,
          figura_legal: mockCustomerData.figura_legal,
          tipo_empresa: mockCustomerData.tipo_empresa,
          is_agente_retencion: mockCustomerData.is_agente_retencion,
          porcent_retencion_iva: mockCustomerData.porcent_retencion_iva,
          porcent_retencion_islr: mockCustomerData.porcent_retencion_islr,
          porcent_retencion_municipio: mockCustomerData.porcent_retencion_municipio,
          fiscalAddress: mockCustomerData.fiscalAddress,
          persona_contacto_info: mockCustomerData.persona_contacto_info,
          persona_cobranza_info: mockCustomerData.persona_cobranza_info,
          documento_constitutivo_info: mockCustomerData.documento_constitutivo_info,
          representante_legal_info: mockCustomerData.representante_legal_info,
          priceList: { connect: { id: mockCustomerData.priceListId } },
          product: { connect: { id: mockCustomerData.productId } },
          type: mockCustomerData.type,
          user: { connect: { id: EXISTING_USER_ID } },
        }),
      })
    );
  });

  it('should return 400 if doc_number is missing for new user creation when email is provided and useExistingUser is false', async () => {
    const customerDataWithoutDocNumber = {
      ...FULL_VALID_CUSTOMER_DATA,
      taxIdPrefix: undefined, // Explicitly missing
      taxIdNumber: undefined, // Explicitly missing
    };

    mockCustomerFormSchemaTransformed.safeParse.mockReturnValue({ success: true, data: customerDataWithoutDocNumber });

    const req = createMockRequest(customerDataWithoutDocNumber, MOCK_ADMIN_SESSION);
    const res = await POST(req);
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
            name: ['String must contain at least 2 character(s)'],
          },
        }),
      },
    };
    mockCustomerFormSchemaTransformed.safeParse.mockReturnValue(mockZodError);

    const invalidCustomerData = {
      ...FULL_VALID_CUSTOMER_DATA,
      email: 'invalid-email', // Trigger Zod error
      name: 'T', // Trigger Zod error
    };

    const req = createMockRequest(invalidCustomerData, MOCK_ADMIN_SESSION);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errors).toHaveProperty('email');
    expect(json.errors).toHaveProperty('name');
  });

  });