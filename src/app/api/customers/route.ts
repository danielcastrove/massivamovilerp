// massivamovilerp/src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { customerFormSchemaTransformed } from "@/lib/validations/customer";
import { auth } from '@/lib/auth';
import { withApiKeyAuth } from '@/lib/apikey-guard';
import { sendEmail } from "@/lib/email";

function generateRandomPassword(length = 10) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

export async function POST(req: Request) {
  return withApiKeyAuth(req, async (ctx) => {
  try {
    const body = await req.json();

    if (!ctx?.fromApiKey) {
      const session = ctx?.session ?? await auth();
      if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      const userRole = session.user.role;
      if (userRole !== 'MASSIVA_ADMIN' && userRole !== 'MASSIVA_EXTRA') {
        return NextResponse.json({ message: 'Forbidden: Insufficient role permissions.' }, { status: 403 });
      }
    }
    
    const validation = customerFormSchemaTransformed.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
        
    const {
        email,
        useExistingUser,
        userId,
        taxType,
        isTaxExempt,
        ...customerDbData 
    } = validation.data as any;

    const result = await prisma.$transaction(async (tx) => {
        let finalUserId: string | undefined = undefined;
        let emailData: any = undefined;

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
                const plainPassword = generateRandomPassword();
                const hashedPassword = await bcrypt.hash(plainPassword, 10);
                
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

                emailData = {
                    newUserCreated: true,
                    email,
                    plainPassword,
                    firstName,
                    customerName: customerDbData.name
                };
            }
        }

        if (!finalUserId) throw new Error("No se pudo determinar el ID de usuario.");

        const newCustomer = await tx.customer.create({
            data: {
                ...customerDbData,
                email,
                settings: {
                    taxType,
                    isTaxExempt
                },
                user: { connect: { id: finalUserId } },
            },
        });
      
        return { error: false, newCustomer, emailData };
    });

    if (result.error) {
        const { error, status, ...rest } = result;
        return NextResponse.json(rest, { status });
    }

    if (result.emailData?.newUserCreated) {
        try {
            const { email, plainPassword, firstName, customerName } = result.emailData;
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #6d28d9; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Bienvenido a MassivaMovil ERP</h1>
                    </div>
                    <div style="padding: 30px; line-height: 1.6;">
                        <p>Hola <strong>${firstName || 'Cliente'}</strong>,</p>
                        <p>Se ha creado una cuenta para su empresa <strong>${customerName}</strong> en nuestra plataforma de gestión.</p>
                        
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #6d28d9; margin: 20px 0;">
                            <p style="margin-top: 0;"><strong>Sus credenciales de acceso:</strong></p>
                            <p style="margin-bottom: 5px;"><strong>URL:</strong> <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://massivamovilerp.vercel.app'}" style="color: #6d28d9;">Acceder al Portal</a></p>
                            <p style="margin-bottom: 5px;"><strong>Usuario:</strong> ${email}</p>
                            <p style="margin-bottom: 10px;"><strong>Contraseña Temporal:</strong> <span style="font-family: monospace; background: #eee; padding: 2px 5px; border-radius: 3px;">${plainPassword}</span></p>
                            <p style="margin-top: 15px; color: #dc2626; font-weight: bold; border-top: 1px solid #e5e7eb; pt-10px; padding-top: 10px;">⚠️ ESTA ES SU CLAVE TEMPORAL. Por razones de seguridad, cámbiela lo más pronto posible una vez ingrese al sistema.</p>
                        </div>

                        <p>Le recomendamos cambiar su contraseña después de su primer inicio de sesión por motivos de seguridad.</p>
                        
                        <p style="margin-top: 30px;">Si tiene alguna duda, por favor contáctenos.</p>
                        <p>Saludos,<br>El equipo de MassivaMovil.com</p>
                    </div>
                    <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                        Este es un correo automático, por favor no responda a esta dirección.
                    </div>
                </div>
            `;

            await sendEmail({ to: email, subject: 'Credenciales de acceso - MassivaMovil ERP', html: htmlContent });
            console.log(`Correo de bienvenida enviado a ${email}`);
        } catch (emailError) {
            console.error("Error al enviar el correo:", emailError);
        }
    }

    return NextResponse.json(result.newCustomer, { status: 201 });

  } catch (error: any) {
    console.error("Error creating customer:", error);
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      return NextResponse.json({ message: `Error: Ya existe un registro con ese valor (${target.join(', ')}).` }, { status: 409 });
    }
    return NextResponse.json({ message: error.message || "Error interno." }, { status: 500 });
  }
  });
}

export async function GET(request: Request) {
  return withApiKeyAuth(request, async (ctx) => {
    try {
      const session = ctx?.fromApiKey ? null : (ctx?.session ?? await auth());
      if (!ctx?.fromApiKey && (!session || !session.user)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }

      const userRole = ctx?.fromApiKey ? 'MASSIVA_ADMIN' : session!.user.role;
      let customers;

      if (userRole === 'CLIENTE') {
        customers = await prisma.customer.findUnique({
          where: { user_id: session!.user.id },
          include: { user: true }
        });
      } else {
        customers = await prisma.customer.findMany({
          include: { 
              user: { select: { id: true, email: true, nombre: true, apellido: true } }
          },
          orderBy: { created_at: 'desc' }
        });
      }
      return NextResponse.json(customers, { status: 200 });
    } catch (error) {
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
  });
}
