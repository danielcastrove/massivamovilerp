// massivamovilerp/src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { customerFormSchema, customerFormSchemaTransformed } from "@/lib/validations/customer";
import { auth } from '@/lib/auth'; // Added for GET handler


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
        
    const {
        useExistingUser, // This field is removed by customerFormSchemaTransformed, but for clarity of previous logic, it's mentioned.
        userId,        // This field is removed by customerFormSchemaTransformed, but for clarity of previous logic, it's mentioned.
        productId,     // Extracted for invoice creation
        email,         // For user linking/creation
        priceListId,   // For connecting to customer
        type,          // For customer type
        ...restOfCustomerData // All other fields for customer creation
    } = validation.data;

    // Derive doc_number from taxIdPrefix and taxIdNumber (should be part of restOfCustomerData now)
    // const doc_number = restOfCustomerData.taxIdPrefix && restOfCustomerData.taxIdNumber ? `${restOfCustomerData.taxIdPrefix}-${restOfCustomerData.taxIdNumber}` : undefined;
    const doc_number = restOfCustomerData.taxIdNumber;
    const tipo_doc_identidad = restOfCustomerData.taxIdPrefix;

    const result = await prisma.$transaction(async (tx) => {
        let finalUserId: string | undefined = undefined; // Initialize finalUserId

        // User determination logic
        // If an email is provided and useExistingUser is false, try to find or create a user.
        // If useExistingUser is true and userId is provided, use that userId.
        if (email) {
            const existingUser = await tx.user.findUnique({ where: { email: email } });
            if (existingUser) {
                finalUserId = existingUser.id;
            } else {
                if (typeof doc_number !== 'string') {
                    throw new Error("Document number is required for hashing the password for a new user.");
                }
                const hashedPassword = await bcrypt.hash(doc_number, 10);
                const newUser = await tx.user.create({
                    data: { email: email, password_hash: hashedPassword, role: 'CLIENTE' },
                });
                finalUserId = newUser.id;
            }
        } else if (userId) { // If email is not provided, but userId is (implies useExistingUser was true and userId was set)
             finalUserId = userId;
        } else {
            throw new Error("Se requiere email para crear un nuevo usuario o ID de usuario existente para asociar al cliente.");
        }
        
        if (!finalUserId) {
            throw new Error("No se pudo determinar el ID de usuario para asociar al cliente.");
        }

        if (typeof doc_number === 'undefined') {
            throw new Error("Document number (doc_number) is required for customer creation.");
        }

        const newCustomer = await tx.customer.create({
            data: {
                ...restOfCustomerData, // Use the rest of the validated data
                doc_number: doc_number,
                tipo_doc_identidad: tipo_doc_identidad,
                type: type, // Ensure type is passed
                user: { connect: { id: finalUserId } },
                priceList: { connect: { id: priceListId } },
            },
        });

        // If productId is provided, create an initial invoice for the customer
        if (productId) {
            // Placeholder values for invoice creation for MVP.
            // The full invoicing engine will handle actual calculations.
            const issueDate = new Date();
            const dueDate = new Date();
            dueDate.setDate(issueDate.getDate() + 30); // Example: due in 30 days

            await tx.invoice.create({
                data: {
                    customerId: newCustomer.id,
                    type: 'FACTURA', // Default to FACTURA for initial creation
                    status: 'PENDING', // Default status
                    issue_date: issueDate,
                    due_date: dueDate,
                    currency_rate: new Prisma.Decimal(1), // Placeholder, BCV rate will be applied by invoicing engine
                    subtotal_usd: new Prisma.Decimal(0),
                    tax_amount_usd: new Prisma.Decimal(0),
                    total_usd: new Prisma.Decimal(0),
                    subtotal_bs: new Prisma.Decimal(0),
                    tax_amount_bs: new Prisma.Decimal(0),
                    total_bs: new Prisma.Decimal(0),
                    retention_amount_bs: new Prisma.Decimal(0),
                    proximo_vencimiento_producto: dueDate, // Placeholder
                    items: {
                        create: {
                            productId: productId,
                            quantity: 1, // Default quantity
                            unit_price_usd: new Prisma.Decimal(0), // Placeholder
                            total_usd: new Prisma.Decimal(0), // Placeholder
                        },
                    },
                },
            });
        }
      
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

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role; // Assuming user.role is available in the session

    let customers;

    if (userRole === 'CLIENTE') {
      // For CLIENTE role, fetch only their own customer data
      customers = await prisma.customer.findUnique({
        where: {
          user_id: session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellido: true,
            },
          },
        },
      });
      if (!customers) {
        return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
      }
    } else if (userRole === 'MASSIVA_ADMIN' || userRole === 'MASSIVA_EXTRA') {
      // For admin and extra roles, fetch all customers
      customers = await prisma.customer.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellido: true,
            },
          },
        },
      });
    } else {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}