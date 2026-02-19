
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { customerFormSchema, customerFormSchemaTransformed } from "@/lib/validations/customer";
import { auth } from '@/lib/auth';

// Make sure formatPhoneNumberForSupabase is available at the module scope
const formatPhoneNumberForSupabase = (phoneNumber: string | undefined): string | undefined => {
  if (!phoneNumber) return phoneNumber;
  let cleanedNumber = phoneNumber.replace(/\D/g, '');
  if (cleanedNumber.startsWith('0')) {
    cleanedNumber = cleanedNumber.substring(1);
  }
  return `+58${cleanedNumber}`;
};




export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !session.user || (session.user.role !== 'MASSIVA_ADMIN' && session.user.role !== 'MASSIVA_EXTRA')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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
        productId,
        sameAsContact,
        email,
        priceListId,
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
        representante_legal_info
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
    const dataForCustomerUpdate: Prisma.CustomerUpdateInput = {
      name: businessName,
      email: email,
      tipo_doc_identidad: taxIdPrefix,
      doc_number: `${taxIdNumber}`, // This is the core fix for the bug
      direccion_fiscal: fiscalAddress,
      telefono_empresa: formatPhoneNumberForSupabase(phoneNumber),
      telefono_celular: formatPhoneNumberForSupabase(telefono_celular),
      sitio_web: sitio_web,
      ciudad: ciudad,
      estado: estado,
      pais: pais,
      codigo_postal: codigo_postal,
      tipo_venta: tipo_venta,
      figura_legal: figura_legal,
      tipo_empresa: tipo_empresa,
      email_user_masiva_SMS: email_user_masiva_SMS,
      email_user_masiva_whatsapp: email_user_masiva_whatsapp,
      type: type,
      persona_contacto_info: {
          ...persona_contacto_info,
          telefono: formatPhoneNumberForSupabase(persona_contacto_info.telefono),
          telefono_celular: formatPhoneNumberForSupabase(persona_contacto_info.telefono_celular),
      },
      // Handle conditional 'persona_cobranza_info'
      persona_cobranza_info: sameAsContact
        ? {
            ...persona_contacto_info,
            telefono: formatPhoneNumberForSupabase(persona_contacto_info.telefono),
            telefono_celular: formatPhoneNumberForSupabase(persona_contacto_info.telefono_celular),
          }
        : {
            ...persona_cobranza_info,
            telefono: formatPhoneNumberForSupabase(persona_cobranza_info.telefono),
            telefono_celular: formatPhoneNumberForSupabase(persona_cobranza_info.telefono_celular),
          },
      documento_constitutivo_info: documento_constitutivo_info,
      is_agente_retencion: is_agente_retencion,
      porcent_retencion_iva: porcent_retencion_iva,
      porcent_retencion_islr: porcent_retencion_islr,
      porcent_retencion_municipio: porcent_retencion_municipio,
      representante_legal_info: {
          ...representante_legal_info,
          telefono_celular: formatPhoneNumberForSupabase(representante_legal_info.telefonoNumber),
      },
      user: finalUserId ? { connect: { id: finalUserId } } : { disconnect: true },
      priceList: { connect: { id: priceListId } },
    };

    // The transaction logic can remain as is, since we are now passing a valid object
    const [updatedCustomer] = await prisma.$transaction(async (tx) => {
      const customerUpdate = await tx.customer.update({
        where: { id: id },
        data: dataForCustomerUpdate,
      });

      if (productId) {
        // This logic for updating invoice based on product can be refined later if needed
        const latestInvoice = await tx.invoice.findFirst({
          where: { customer_id: id },
          orderBy: { issue_date: 'desc' },
        });
        if (latestInvoice) {
          // ... logic to update invoice if necessary
        }
      }
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
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params;
      const session = await auth();
      if (!session || !session.user || session.user.role !== 'MASSIVA_ADMIN') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
  
      await prisma.customer.delete({
        where: { id: id },
      });
  
      return NextResponse.json({ message: 'Customer deleted successfully' }, { status: 200 });
  
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
  }
