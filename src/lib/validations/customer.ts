// massivamovilerp/src/lib/validations/customer.ts
import * as z from "zod";
import { DocumentType, SaleType, LegalFigure, CompanyType } from "@prisma/client";

const venezuelanPhoneRegex = new RegExp(/^(0?_?(412|414|416|0?_?424|0?_?426))?_?\d{7}$/);

export const customerFormSchema = z.object({
  // Step 0: Seleccionar Usuario Cliente
  useExistingUser: z.boolean().default(false),
  userId: z.string().uuid().optional(), // Used if useExistingUser is true

  // Step 1: Datos de la Empresa
  businessName: z.string().min(1, "La razón social es requerida."),
  taxIdPrefix: z.enum(["J", "V", "E", "P", "G"]),
  taxIdNumber: z.string().min(1, "El RIF es requerido."),
  email: z.string().email("Debe ser un email válido."),
  phonePrefix: z.literal("+58"),
  phoneNumber: z.string().regex(venezuelanPhoneRegex, "Número de teléfono inválido."),
  telefono_celularPrefix: z.literal("+58"),
  telefono_celular: z.string().regex(venezuelanPhoneRegex, "Número de celular inválido.").optional().or(z.literal('')),
  sitio_web: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
  address: z.string().min(1, "La dirección es requerida."),
  email_user_masiva_SMS: z.string().email("Debe ser un email válido.").optional().or(z.literal('')),
  email_user_masiva_whatsapp: z.string().email("Debe ser un email válido.").optional().or(z.literal('')),
  ciudad: z.string().min(1, "La ciudad es requerida."),
  estado: z.string().min(1, "El estado es requerido."),
  pais: z.string().min(1, "El país es requerido."),
  codigo_postal: z.string().min(1, "El código postal es requerido."),
  tipo_venta: z.enum(["MAYOR", "DETAL", "MAYOR_Y_DETAL"]),
  figura_legal: z.enum(["PERSONA_JURIDICA", "GOBIERNO_EMPRENDEDOR_CON_FIRMA_PERSONAL", "EMPRENDEDOR_SOLO_CON_RIF"]),
  tipo_empresa: z.enum(["EMPRESA", "FABRICANTE", "PRODUCTOR", "DISTRIBUIDORA", "MAYORISTA", "COMERCIO", "RESTAURANT", "SUPERMERCADO", "ABASTO", "PANADERIA", "FARMACIA"]),

  // Step 2: Persona de Contacto
  persona_contacto_info: z.object({
    nombre: z.string().min(1, "El nombre de contacto es requerido."),
    email: z.string().email("Email de contacto inválido."),
    telefonoPrefix: z.string(),
    telefono: z.string().regex(venezuelanPhoneRegex, "Teléfono inválido."),
    telefono_celularPrefix: z.string().optional(),
    telefono_celular: z.string().regex(venezuelanPhoneRegex, "Celular inválido.").optional().or(z.literal('')),
    cargo: z.string().min(1, "El cargo es requerido."),
  }),

  // Step 3: Persona de Cobranza
  sameAsContact: z.boolean().default(false),
  persona_cobranza_info: z.object({
    nombre: z.string().min(1, "El nombre de cobranza es requerido."),
    email: z.string().email("Email de cobranza inválido."),
    telefonoPrefix: z.string(),
    telefono: z.string().regex(venezuelanPhoneRegex, "Teléfono inválido."),
    telefono_celularPrefix: z.string().optional(),
    telefono_celular: z.string().regex(venezuelanPhoneRegex, "Celular inválido.").optional().or(z.literal('')),
    cargo: z.string().min(1, "El cargo es requerido."),
  }).optional(),

  // Step 4: Documento Constitutivo
  documento_constitutivo_info: z.object({
    nombre_registro: z.string().optional().or(z.literal('')),
    fecha_registro: z.string().optional().or(z.literal('')),
    nro_tomo: z.string().optional().or(z.literal('')),
    email_registro: z.string().email("Email de registro inválido.").optional().or(z.literal('')),
  }).optional(),

  // Step 5: Información Fiscal
  taxType: z.enum(["ORDINARY", "SPECIAL"]),
  is_agente_retencion: z.boolean().default(false),
  porcent_retencion_iva: z.coerce.number().min(0).max(100).optional(),
  porcent_retencion_islr: z.coerce.number().min(0).max(100).optional(),
  porcent_retencion_municipio: z.coerce.number().min(0).max(100).optional(),
  fiscalAddress: z.string().min(1, "La dirección fiscal es requerida."),
  isTaxExempt: z.boolean().default(false),

  // Step 6: Representante Legal
  representante_legal_info: z.object({
    nombre: z.string().min(1, "El nombre es requerido."),
    email: z.string().email("Email del representante inválido."),
    cedulaPrefix: z.enum(["V", "E"]),
    cedulaNumber: z.string().regex(/^\d+$/, "El número de cédula solo debe contener dígitos.").min(1, "El número de cédula es requerido."),
    telefonoPrefix: z.string(),
    telefonoNumber: z.string().regex(venezuelanPhoneRegex, "Teléfono inválido.").min(1, "El teléfono es requerido."),
    cargo: z.string().optional().or(z.literal('')),
  }),

  // Step 7: Suscripción Inicial
  priceListId: z.string().uuid("Seleccione una lista de precios válida.").min(1, "La lista de precios es requerida."),
  productId: z.string().uuid("Seleccione un producto válido.").min(1, "El producto es requerido."),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;