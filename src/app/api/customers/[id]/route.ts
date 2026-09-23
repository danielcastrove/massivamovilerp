
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { customerFormSchema, customerFormSchemaTransformed } from "@/lib/validations/customer";
import { auth } from '@/lib/auth';
import { withApiKeyAuth } from '@/lib/apikey-guard';

// Make sure formatPhoneNumberForSupabase is available at the module scope
const formatPhoneNumberForSupabase = (phoneNumber: string | null | undefined): string | null | undefined => {
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




export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
  try {
    const { id } = await params;
    if (!ctx?.fromApiKey) {
      const session = ctx?.session ?? await auth();
      if (!session || !session.user || (session.user.role !== 'MASSIVA_ADMIN' && session.user.role !== 'MASSIVA_EXTRA')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json();
    // Step 1: Validate with the raw, non-transformed schema
    const validation = customerFormSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    // Step 2: Manually destructure all fields from the validated data
    const {
        businessName,
        taxIdPrefix,
        taxIdNumber,
        phoneNumber,
        fiscalAddress,
        useExistingUser,
        userId,
        services,
        sameAsContact,
        email,
        type,
        sitio_web,
        telefono_celular,
        address, // Note: 'address' from form is mapped to 'direccion_fiscal'
        ciudad,
        estado,
        pais,
        codigo_postal,
        tipo_venta,
        figura_legal,
        tipo_empresa,
        email_user_masiva_SMS,
        email_user_masiva_whatsapp,
        persona_contacto_info,
        persona_cobranza_info,
        documento_constitutivo_info,
        is_agente_retencion,
        porcent_retencion_iva,
        porcent_retencion_islr,
        porcent_retencion_municipio,
        representante_legal_info,
        taxType,
        isTaxExempt
    } = validation.data;

    let finalUserId: string | null = null;
    if (useExistingUser && userId) {
      finalUserId = userId;
    } else if (!useExistingUser && email) {
      const existingUser = await prisma.user.findUnique({ where: { email: email } });
      if (existingUser) {
        finalUserId = existingUser.id;
      }
    }

    // Step 3: Carefully construct the data object for Prisma, only including valid model fields
    // Ensure empty strings are treated as null for optional fields and enums
    const dataForCustomerUpdate: Prisma.CustomerUpdateInput = {
      name: businessName,
      status: (validation.data as any).status || 'ACTIVE',
      email: email || null,
      tipo_doc_identidad: taxIdPrefix,
      doc_number: `${taxIdPrefix}-${taxIdNumber}`,
      direccion_fiscal: fiscalAddress || address || null,
      telefono_empresa: formatPhoneNumberForSupabase(phoneNumber) || null,
      telefono_celular: formatPhoneNumberForSupabase(telefono_celular) || null,
      sitio_web: sitio_web || null,
      ciudad: ciudad || null,
      estado: estado || null,
      pais: pais || null,
      codigo_postal: codigo_postal || null,
      tipo_venta: tipo_venta || null,
      figura_legal: figura_legal || null,
      tipo_empresa: tipo_empresa || null,
      rubro: (validation.data as any).rubro && (validation.data as any).rubro !== "" ? (validation.data as any).rubro : null,
      email_user_masiva_SMS: email_user_masiva_SMS || null,
      email_user_masiva_whatsapp: email_user_masiva_whatsapp || null,
      type: type,
      settings: {
        taxType: taxType || "ORDINARY",
        isTaxExempt: !!isTaxExempt
      },
      // Formato: [priceListId, productId|custom_product, isManualMode, custom_product, price_usd, price_bs]
      servicios_contratados: services.map(s => [
        s.priceListId,
        s.isManualMode ? s.custom_product : s.productId,
        s.isManualMode,
        s.custom_product,
        (s as any).price_usd ?? null,
        (s as any).price_bs ?? null
      ]),
      persona_contacto_info: {
          ...persona_contacto_info,
          telefono: formatPhoneNumberForSupabase(persona_contacto_info.telefono),
          telefono_celular: formatPhoneNumberForSupabase(persona_contacto_info.telefono_celular),
      } as any,
      // Handle conditional 'persona_cobranza_info'
      persona_cobranza_info: (sameAsContact
        ? {
            ...persona_contacto_info,
            telefono: formatPhoneNumberForSupabase(persona_contacto_info.telefono),
            telefono_celular: formatPhoneNumberForSupabase(persona_contacto_info.telefono_celular),
          }
        : {
            ...persona_cobranza_info,
            telefono: formatPhoneNumberForSupabase(persona_cobranza_info.telefono),
            telefono_celular: formatPhoneNumberForSupabase(persona_cobranza_info.telefono_celular),
          }) as any,
      documento_constitutivo_info: documento_constitutivo_info as any,
      is_agente_retencion: !!is_agente_retencion,
      porcent_retencion_iva: porcent_retencion_iva !== undefined && porcent_retencion_iva !== null ? new Prisma.Decimal(porcent_retencion_iva) : null,
      porcent_retencion_islr: porcent_retencion_islr !== undefined && porcent_retencion_islr !== null ? new Prisma.Decimal(porcent_retencion_islr) : null,
      porcent_retencion_municipio: porcent_retencion_municipio !== undefined && porcent_retencion_municipio !== null ? new Prisma.Decimal(porcent_retencion_municipio) : null,
      representante_legal_info: representante_legal_info as any,
      user: finalUserId ? { connect: { id: finalUserId } } : { disconnect: true },
    };

    // The transaction logic can remain as is, since we are now passing a valid object
    const [updatedCustomer] = await prisma.$transaction(async (tx) => {
      const customerUpdate = await tx.customer.update({
        where: { id: id },
        data: dataForCustomerUpdate,
      });

      return [customerUpdate];
    });

    return NextResponse.json(updatedCustomer, { status: 200 });

  } catch (error) {
    console.error("Error updating customer:", error);
    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("Prisma Validation Error Details:", error.message);
    }
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiKeyAuth(req, async (ctx) => {
    try {
      const { id } = await params;
      if (!ctx?.fromApiKey) {
        const session = ctx?.session ?? await auth();
        if (!session || !session.user || session.user.role !== 'MASSIVA_ADMIN') {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
      }

      // Proceso de eliminación segura con dependencias
      await prisma.$transaction(async (tx) => {
        // 1. Obtener datos del cliente para saber si tiene un usuario asociado
        const customer = await tx.customer.findUnique({
          where: { id },
          select: { user_id: true }
        });

        if (!customer) throw new Error("Cliente no encontrado");

        // 2. Borrar items de facturas asociados a facturas de este cliente
        // (Aunque InvoiceItem tiene Cascade con Invoice, lo hacemos explícito por seguridad si hay otras relaciones)
        await tx.invoiceItem.deleteMany({
          where: { invoice: { customer_id: id } }
        });

        // 3. Borrar facturas del cliente
        await tx.invoice.deleteMany({
          where: { customer_id: id }
        });

        // 4. Borrar el cliente
        await tx.customer.delete({
          where: { id }
        });

        // 5. Si tiene un usuario asociado y es rol CLIENTE, lo borramos también
        // para no dejar usuarios huérfanos sin cliente.
        if (customer.user_id) {
          const user = await tx.user.findUnique({
            where: { id: customer.user_id },
            select: { role: true }
          });

          if (user && user.role === 'CLIENTE') {
            await tx.user.delete({
              where: { id: customer.user_id }
            });
          }
        }
      });
  
      return NextResponse.json({ message: 'Cliente y datos asociados eliminados correctamente' }, { status: 200 });
  
    } catch (error) {
      console.error("Error deleting customer:", error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
        }
      }
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
      return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
  });
}
