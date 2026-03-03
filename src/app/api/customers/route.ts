// massivamovilerp/src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { customerFormSchemaTransformed } from "@/lib/validations/customer";
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== 'MASSIVA_ADMIN' && userRole !== 'MASSIVA_EXTRA') {
      return NextResponse.json({ message: 'Forbidden: Insufficient role permissions.' }, { status: 403 });
    }
    
    const validation = customerFormSchemaTransformed.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
        
    // Extraemos los campos que NO van a la tabla Customer (control y relaciones)
    const {
        productId,
        email,
        priceListId,
        useExistingUser,
        userId,
        // Campos de UI/Formulario que Zod ya transformó
        phonePrefix,
        phoneNumber,
        telefono_celularPrefix,
        address,
        sameAsContact,
        taxIdPrefix,
        taxIdNumber,
        fiscalAddress,
        // Campos que deben ir dentro de 'settings' (JSON) en lugar de columnas directas
        taxType,
        isTaxExempt,
        ...customerDbData 
    } = validation.data as any;

    const result = await prisma.$transaction(async (tx) => {
        let finalUserId: string | undefined = undefined;

        if (useExistingUser && userId) {
            finalUserId = userId;
        } 
        else if (email) {
            const existingUser = await tx.user.findUnique({ where: { email } });
            if (existingUser) {
                const existingCustomerForUser = await tx.customer.findFirst({
                    where: { user_id: existingUser.id },
                });

                if (existingCustomerForUser) {
                    return { 
                        error: true,
                        status: 409,
                        message: 'Ya existe un usuario con este email asociado a otro cliente.',
                        action: 'user_already_associated'
                    };
                } else {
                    return { 
                        error: true,
                        status: 409,
                        message: 'Ya existe un usuario con este email. ¿Desea asociarlo?',
                        existingUserId: existingUser.id,
                        action: 'prompt_to_associate'
                    };
                }
            } else {
                // Escenario 2: Crear nuevo usuario (password = RIF/Cédula)
                const hashedPassword = await bcrypt.hash(customerDbData.doc_number, 10);
                
                // Intentamos separar el nombre del contacto para llenar nombre y apellido del usuario
                const fullContactName = customerDbData.persona_contacto_info?.nombre || customerDbData.name;
                const nameParts = fullContactName.trim().split(/\s+/);
                const firstName = nameParts[0];
                const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

                const newUser = await tx.user.create({
                    data: { 
                        email, 
                        password_hash: hashedPassword, 
                        role: 'CLIENTE',
                        nombre: firstName,
                        apellido: lastName || undefined,
                        telefono_celular: customerDbData.telefono_celular || undefined,
                        cargo: customerDbData.persona_contacto_info?.cargo || undefined
                    },
                });
                finalUserId = newUser.id;
            }
        }

        if (!finalUserId) throw new Error("No se pudo determinar el ID de usuario.");

        // Crear Cliente
        const newCustomer = await tx.customer.create({
            data: {
                ...customerDbData,
                email, // Guardamos el email también en el cliente
                settings: {
                    taxType,
                    isTaxExempt
                },
                user: { connect: { id: finalUserId } },
                priceList: priceListId ? { connect: { id: priceListId } } : undefined,
                product: productId ? { connect: { id: productId } } : undefined,
            },
        });

        // Factura inicial
        if (productId) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            await tx.invoice.create({
                data: {
                    customer_id: newCustomer.id,
                    type: 'FACTURA',
                    status: 'DRAFT',
                    due_date: dueDate,
                    currency_rate: new Prisma.Decimal(1),
                    subtotal_usd: new Prisma.Decimal(0),
                    tax_amount_usd: new Prisma.Decimal(0),
                    total_usd: new Prisma.Decimal(0),
                    subtotal_bs: new Prisma.Decimal(0),
                    tax_amount_bs: new Prisma.Decimal(0),
                    total_bs: new Prisma.Decimal(0),
                    retention_amount_bs: new Prisma.Decimal(0),
                    proximo_vencimiento_producto: dueDate,
                    invoice_items: {
                        create: {
                            product_id: productId,
                            price_list_id: priceListId || "",
                            quantity: 1,
                            unit_price_usd: new Prisma.Decimal(0),
                            total_usd: new Prisma.Decimal(0),
                        },
                    },
                },
            });
        }
      
        return { error: false, newCustomer };
    });

    if (result.error) {
        const { error, status, ...rest } = result;
        return NextResponse.json(rest, { status });
    }

    return NextResponse.json(result.newCustomer, { status: 201 });

  } catch (error: any) {
    console.error("Error creating customer:", error);

    // Manejo de errores de duplicidad de Prisma (RIF, Email, etc.)
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      return NextResponse.json({ 
        message: `Error: Ya existe un registro con ese valor (${target.join(', ')}).` 
      }, { status: 409 });
    }

    return NextResponse.json({ message: error.message || "Error interno." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userRole = session.user.role;
    let customers;

    if (userRole === 'CLIENTE') {
      customers = await prisma.customer.findUnique({
        where: { user_id: session.user.id },
        include: { user: true }
      });
    } else {
      customers = await prisma.customer.findMany({
        include: { user: { select: { id: true, email: true, nombre: true, apellido: true } } },
        orderBy: { created_at: 'desc' }
      });
    }
    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
