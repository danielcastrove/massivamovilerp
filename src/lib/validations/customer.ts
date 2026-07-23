// massivamovilerp/src/lib/validations/customer.ts
import * as z from "zod";
import { DocumentType, SaleType, LegalFigure, CompanyType } from "@prisma/client";

const contactInfoSchema = z.object({
  nombre: z.string().min(1, { message: "El nombre es obligatorio." }),
  email: z.string().email({ message: "Formato de email inválido." }).min(1, { message: "El email es obligatorio." }),
  telefonoPrefix: z.literal("+58").default("+58"), // Auto-filled and disabled in UI
  telefono: z.string().min(1, { message: "El número de teléfono es obligatorio." }),
  telefono_celularPrefix: z.literal("+58").default("+58"),
  telefono_celular: z.string().optional().nullable(),
  cargo: z.string().min(1, { message: "El cargo es obligatorio." }),
});

const documentoConstitutivoSchema = z.object({
  nombre_registro: z.string().min(1, { message: "El nombre del registro es obligatorio." }),
  fecha_registro: z.string().min(1, { message: "La fecha de registro es obligatoria." }), // Assuming YYYY-MM-DD format from UI
  nro_tomo: z.string().min(1, { message: "El número y tomo es obligatorio." }),
  email_registro: z.string().email({ message: "Formato de email inválido." }).or(z.literal("")).optional().nullable(),
});

const representanteLegalSchema = z.object({
  nombre: z.string().min(1, { message: "El nombre del representante es obligatorio." }),
  email: z.string().email({ message: "Formato de email inválido." }).min(1, { message: "El email del representante es obligatorio." }),
  cedulaPrefix: z.enum(["V", "E", "J"], { // Added J as it's a common RIF prefix for individuals too
    errorMap: () => ({ message: "El prefijo de cédula es obligatorio." }),
  }).default("V"),
  cedulaNumber: z.string().min(1, { message: "El número de cédula es obligatorio." }),
  telefonoPrefix: z.literal("+58").default("+58"), // Auto-filled and disabled in UI
  telefonoNumber: z.string().min(1, { message: "El número de teléfono es obligatorio." }),
  cargo: z.string().min(1, { message: "El cargo es obligatorio." }),
});


export const customerFormSchema = z.object({
  // Step 0: Usuario
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).default("ACTIVE"),
  useExistingUser: z.boolean().default(false),
  userId: z.string().uuid({ message: "Formato de ID de usuario inválido." }).nullable().optional(),

  // Step 1: Datos Empresa
  businessName: z.string().min(1, { message: "La Razón Social es obligatoria." }),
  taxIdPrefix: z.nativeEnum(DocumentType, {
    errorMap: () => ({ message: "El prefijo de RIF/Cédula es obligatorio." }),
  }),
  taxIdNumber: z.string().min(1, { message: "El número de RIF/Cédula es obligatorio." }),
  email: z.string().email({ message: "El email es inválido." }).min(1, { message: "El email es obligatorio." }),
  phonePrefix: z.literal("+58").default("+58"),
  phoneNumber: z.string().min(1, { message: "El número de teléfono principal es obligatorio." }),
  telefono_celularPrefix: z.literal("+58").default("+58"),
  telefono_celular: z.string().optional().nullable(),
  sitio_web: z.string().url({ message: "Formato de sitio web inválido." }).or(z.literal("")).optional().nullable(),
  address: z.string().min(1, { message: "La dirección física es obligatoria." }),

  // Step 2: Detalles Empresa
  ciudad: z.string().min(1, { message: "La ciudad es obligatoria." }),
  estado: z.string().min(1, { message: "El estado es obligatorio." }),
  pais: z.string().min(1, { message: "El país es obligatorio." }),
  codigo_postal: z.string().min(1, { message: "El código postal es obligatorio." }),
  tipo_venta: z.nativeEnum(SaleType, {
    errorMap: () => ({ message: "El tipo de venta es obligatorio." }),
  }),
  figura_legal: z.nativeEnum(LegalFigure, {
    errorMap: () => ({ message: "La figura legal es obligatoria." }),
  }),
  tipo_empresa: z.nativeEnum(CompanyType, {
    errorMap: () => ({ message: "El tipo de empresa es obligatorio." }),
  }),
  email_user_masiva_SMS: z.string().email({ message: "Formato de email inválido." }).or(z.literal("")).optional().nullable(),
  email_user_masiva_whatsapp: z.string().email({ message: "Formato de email inválido." }).or(z.literal("")).optional().nullable(),
  type: z.enum(["PERSONA", "EMPRESA"], { errorMap: () => ({ message: "El tipo de cliente es obligatorio." }) }),
  rubro: z.string().optional().nullable(),
  
  // Nuevos campos de reseteo SMS
  reseteado_sms: z.boolean().default(false),
  fecha_reseteado: z.string().optional().nullable(), 
  cantidad_sms_antes_reset: z.number().optional().nullable(),
  
  // Nuevos campos de recurrencia
  recurrencia_compra_SMS: z.enum(["MENSUAL", "BIMENSUAL", "TRES_MESES_A_UN_AÑO", "MAS_DE_UN_AÑO"]).optional().nullable(),
  recurrencia_compra_whatsapp: z.enum(["MENSUAL", "BIMENSUAL", "TRES_MESES_A_UN_AÑO", "MAS_DE_UN_AÑO"]).optional().nullable(),

  // Step 3: Contacto
  persona_contacto_info: contactInfoSchema,

  // Step 4: Cobranza (conditionally required)
  sameAsContact: z.boolean().default(false),
  // persona_cobranza_info will be validated in superRefine if sameAsContact is false
  persona_cobranza_info: contactInfoSchema.partial(), // Make all fields optional for this base schema, superRefine will make them required conditionally

  // Step 5: Documento Constitutivo
  documento_constitutivo_info: documentoConstitutivoSchema,

  // Step 6: Impuestos
  taxType: z.enum(["ORDINARY", "SPECIAL"], {
    errorMap: () => ({ message: "El tipo de contribuyente es obligatorio." }),
  }).optional(),
  isTaxExempt: z.boolean().default(false),
  is_agente_retencion: z.boolean().default(false),
  porcent_retencion_iva: z.preprocess((val) => (val === "" ? null : val), z.number().min(0).max(100).nullable().optional()),
  porcent_retencion_islr: z.preprocess((val) => (val === "" ? null : val), z.number().min(0).max(100).nullable().optional()),
  porcent_retencion_municipio: z.preprocess((val) => (val === "" ? null : val), z.number().min(0).max(100).nullable().optional()),
  fiscalAddress: z.string().optional().nullable(),

  // Step 7: Rep. Legal
  representante_legal_info: representanteLegalSchema,

  // Step 8: Suscripción
  services: z.array(z.object({
    priceListId: z.string().uuid().nullable().optional(),
    productId: z.string().uuid().nullable().optional(),
    custom_product: z.string().nullable().optional(),
    isManualMode: z.boolean().default(false),
    price_usd: z.number().optional(),
    price_bs: z.number().optional(),
  })).default([]),
}).superRefine((data, ctx) => {
  // Conditional validation for userId when useExistingUser is true
  if (data.useExistingUser && !data.userId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe seleccionar un usuario existente.",
      path: ['userId'],
    });
  }

  // Conditional validation for persona_cobranza_info if not sameAsContact
  if (!data.sameAsContact) {
    if (!data.persona_cobranza_info?.nombre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre de cobranza es obligatorio.",
        path: ['persona_cobranza_info', 'nombre'],
      });
    }
    if (!data.persona_cobranza_info?.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El email de cobranza es obligatorio.",
        path: ['persona_cobranza_info', 'email'],
      });
    } else if (data.persona_cobranza_info?.email && !z.string().email().safeParse(data.persona_cobranza_info.email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Formato de email de cobranza inválido.",
        path: ['persona_cobranza_info', 'email'],
      });
    }
    if (!data.persona_cobranza_info?.telefono) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El teléfono de cobranza es obligatorio.",
        path: ['persona_cobranza_info', 'telefono'],
      });
    }
    if (!data.persona_cobranza_info?.cargo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El cargo de cobranza es obligatorio.",
        path: ['persona_cobranza_info', 'cargo'],
      });
    }
  }

  // --- START Conditional validation for Impuestos (Step 6) ---
  if (!data.isTaxExempt) { // Only apply tax validations if not tax exempt
    if (data.taxType === undefined || data.taxType === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El tipo de contribuyente es obligatorio.",
        path: ['taxType'],
      });
    }

    if (!data.fiscalAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La dirección fiscal es obligatoria.",
        path: ['fiscalAddress'],
      });
    }

    // Conditional validation for retencion percentages if is_agente_retencion is true
    if (data.is_agente_retencion) {
      if (data.porcent_retencion_iva === undefined || data.porcent_retencion_iva === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El porcentaje de retención IVA es obligatorio si es agente de retención.",
          path: ['porcent_retencion_iva'],
        });
      }
      if (data.porcent_retencion_islr === undefined || data.porcent_retencion_islr === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El porcentaje de retención ISLR es obligatorio si es agente de retención.",
          path: ['porcent_retencion_islr'],
        });
      }
      if (data.porcent_retencion_municipio === undefined || data.porcent_retencion_municipio === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El porcentaje de retención municipal es obligatorio si es agente de retención.",
          path: ['porcent_retencion_municipio'],
        });
      }
    }
  }
  // --- END Conditional validation for Impuestos (Step 6) ---
});

// Transform the schema to map client-side names to server-side names
export const formatPhoneNumberForSupabase = (phoneNumber: string | undefined): string | undefined => {
  if (!phoneNumber) return phoneNumber;

  let cleanedNumber = phoneNumber.replace(/\D/g, '');
  if (cleanedNumber.startsWith('0')) {
    cleanedNumber = cleanedNumber.substring(1);
  }
  if (!cleanedNumber.startsWith('58')) {
    return `+58${cleanedNumber}`;
  }
  return `+${cleanedNumber}`;
};

export const customerFormSchemaTransformed = customerFormSchema.transform((data) => {
  const { businessName, fiscalAddress, taxIdPrefix, taxIdNumber, services, ...rest } = data;

  const transformedData: any = {
    ...rest,
    name: businessName,
    direccion_fiscal: fiscalAddress || data.address,
    tipo_doc_identidad: taxIdPrefix,
    doc_number: `${taxIdPrefix}-${taxIdNumber}`,
    fecha_reseteado: data.fecha_reseteado ? new Date(data.fecha_reseteado) : null,
    // Formato: [priceListId, productId|custom_product, isManualMode, custom_product, price_usd, price_bs]
    // `price_usd/price_bs` son clave para servicios manuales/sin lista (actualización de precios).
    servicios_contratados: services.map(s => [
      s.priceListId,
      s.isManualMode ? s.custom_product : s.productId,
      s.isManualMode,
      s.custom_product,
      s.price_usd ?? null,
      (s as any).price_bs ?? null
    ]),
    telefono_empresa: formatPhoneNumberForSupabase(data.phoneNumber),
    telefono_celular: formatPhoneNumberForSupabase(data.telefono_celular),
    persona_contacto_info: {
      ...data.persona_contacto_info,
      telefono: formatPhoneNumberForSupabase(data.persona_contacto_info.telefono),
      telefono_celular: formatPhoneNumberForSupabase(data.persona_contacto_info.telefono_celular),
    },
    persona_cobranza_info: {
      ...data.persona_cobranza_info,
      telefono: formatPhoneNumberForSupabase(data.persona_cobranza_info.telefono),
      telefono_celular: formatPhoneNumberForSupabase(data.persona_cobranza_info.telefono_celular),
    },
    representante_legal_info: {
      ...data.representante_legal_info,
      telefono_celular: formatPhoneNumberForSupabase(data.representante_legal_info.telefonoNumber),
    },
  };

  return transformedData;
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
export type CustomerFormValuesTransformed = z.infer<typeof customerFormSchemaTransformed>;