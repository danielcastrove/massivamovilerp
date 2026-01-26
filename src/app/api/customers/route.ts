// massivamovilerp/src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { customerFormSchema } from "@/lib/validations/customer";




export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Note: The base `customerFormSchema` now has many optional fields.
    // The backend might need to enforce some of them as required for this specific operation.
    // For now, we are fixing the immediate type error.
    const validation = customerFormSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const {
        businessName,
        taxIdNumber, // Assuming this is the doc_number for now
        email,
        phoneNumber, // Assuming this is telefono_empresa
        telefono_celular,
        sitio_web,
        email_user_masiva_SMS,
        email_user_masiva_whatsapp,
        address,
        ciudad,
        estado,
        pais,
        codigo_postal,
        tipo_venta,
        figura_legal,
        tipo_empresa,
        persona_contacto_info,
        persona_cobranza_info,
        documento_constitutivo_info,
        is_agente_retencion,
        porcent_retencion_iva,
        porcent_retencion_islr,
        porcent_retencion_municipio,
        fiscalAddress,
        representante_legal_info,
        priceListId,
        productId,
        useExistingUser,
        userId
    } = validation.data;

    // The doc_number is used for password hash, it must exist.
    if (!taxIdNumber) {
        return NextResponse.json({ message: "El número de documento (taxIdNumber) es requerido." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let finalUserId = userId;

      // If not using an existing user, email is required to find or create a new one.
      if (!useExistingUser && !email) {
        // Manually throw a validation-style error
        throw new z.ZodError([
          {
            path: ["email"],
            message: "El email es obligatorio si no se selecciona un usuario existente.",
            code: z.ZodIssueCode.custom,
          },
        ]);
      }

      if (useExistingUser && finalUserId) {
        // User explicitly selected, do nothing.
      } else {
        // Due to the check above, email is guaranteed to be a string here.
        const existingUser = await tx.user.findUnique({ where: { email: email! } });
        if (existingUser) {
          finalUserId = existingUser.id;
        } else {
          const hashedPassword = await bcrypt.hash(taxIdNumber, 10);
          const newUser = await tx.user.create({
            data: { email: email!, password_hash: hashedPassword, role: 'CLIENTE' },
          });
          finalUserId = newUser.id;
        }
      }

      if (!finalUserId) {
        throw new Error("No se pudo determinar el ID de usuario para asociar al cliente.");
      }
      
      // Ensure required fields for customer creation are present
      if (!businessName || !priceListId || !productId) {
          throw new Error("Faltan campos requeridos para la creación del cliente: Razón Social, Lista de Precios o Producto inicial.");
      }

      const newCustomer = await tx.customer.create({
        data: {
            name: businessName,
            doc_number: taxIdNumber,
            email: email,
            telefono_empresa: phoneNumber,
            telefono_celular,
            sitio_web,
            email_user_masiva_SMS,
            email_user_masiva_whatsapp,
            direccion_fiscal: fiscalAddress || address,
            ciudad,
            estado,
            pais,
            codigo_postal,
            tipo_venta,
            figura_legal,
            tipo_empresa,
            is_agente_retencion,
            porcent_retencion_iva,
            porcent_retencion_islr,
            porcent_retencion_municipio,
            persona_contacto_info: persona_contacto_info ?? Prisma.JsonNull,
            persona_cobranza_info: persona_cobranza_info ?? Prisma.JsonNull,
            documento_constitutivo_info: documento_constitutivo_info ?? Prisma.JsonNull,
            representante_legal_info: representante_legal_info ?? Prisma.JsonNull,
            user: { connect: { id: finalUserId } },
            priceList: { connect: { id: priceListId } },
            product: { connect: { id: productId } }, 
            type: 'EMPRESA', 
        },
      });
      
      return { newCustomer };
    });

    return NextResponse.json(result.newCustomer, { status: 201 });

  } catch (error) {
    console.error("Error creating customer:", error);

    if (error instanceof z.ZodError) {
        return NextResponse.json({ errors: error.flatten().fieldErrors }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        return NextResponse.json({ message: `Error: Ya existe un registro con este valor. Campo duplicado: ${target.join(', ')}.` }, { status: 409 });
      }
    }
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
