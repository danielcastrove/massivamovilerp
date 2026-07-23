import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { sendPaymentConfirmation } from "@/lib/notifications";

/**
 * Registra un pago independiente asociado a un cliente.
 * Opcionalmente puede recibir una lista de IDs de facturas para actualizar sus estados.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "MASSIVA_ADMIN" && session.user.role !== "MASSIVA_EXTRA")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      customerId,
      amountPaid, 
      currency, 
      exchangeRate, 
      paymentMethod, 
      reference, 
      evidenceUrl, 
      paymentDate, 
      notes,
      appliedInvoiceIds // Opcional: Facturas que se están pagando
    } = body;

    if (!customerId) {
      return NextResponse.json({ message: "El ID del cliente es requerido" }, { status: 400 });
    }

    // 1. Obtener datos del cliente para notificaciones ANTES de la transacción
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        name: true,
        email: true,
        telefono_empresa: true,
        persona_cobranza_info: true,
      }
    });

    if (!customer) {
      return NextResponse.json({ message: "Cliente no encontrado" }, { status: 404 });
    }

    // Ejecutamos en una transacción para asegurar consistencia de datos
    const payment = await prisma.$transaction(async (tx) => {
      // 2. Crear el registro de pago independiente
      const newPayment = await tx.payment.create({
        data: {
          customer_id: customerId,
          amount_paid: new Prisma.Decimal(amountPaid),
          currency: currency || "USD",
          exchange_rate: new Prisma.Decimal(exchangeRate),
          payment_method: paymentMethod,
          reference: reference || null,
          evidence_url: evidenceUrl || null,
          payment_date: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || null,
        },
      });

      // 3. Si se proporcionaron facturas, actualizarlas a PAID
      if (appliedInvoiceIds && Array.isArray(appliedInvoiceIds) && appliedInvoiceIds.length > 0) {
        await tx.invoice.updateMany({
          where: {
            id: { in: appliedInvoiceIds },
            customer_id: customerId
          },
          data: {
            status: "PAID"
          }
        });
      }

      return newPayment;
    });

    // 4. Disparar notificaciones (AHORA AFUERA Y ESPERADAS)
    // Buscamos el teléfono de cobranza o el de la empresa
    const contactPhone = (customer.persona_cobranza_info as any)?.telefono || customer.telefono_empresa;
    const contactEmail = (customer.persona_cobranza_info as any)?.email || customer.email;

    if (contactPhone || contactEmail) {
        try {
            console.log(`[PAYMENT_NOTIFICATION] Enviando confirmación a ${customer.name}...`);
            await sendPaymentConfirmation({
                toPhone: contactPhone,
                toEmail: contactEmail,
                customerName: customer.name,
                amount: amountPaid,
                currency: currency || "USD",
                reference: reference
            });
            console.log(`[PAYMENT_NOTIFICATION] Notificaciones enviadas.`);
        } catch (err) {
            console.error("[PAYMENT_NOTIFICATION_ERROR]", err);
            // No fallamos la respuesta principal si falla la notificación,
            // pero lo dejamos logueado para depuración.
        }
    }

    // Serialización explícita para evitar problemas con Prisma.Decimal en la respuesta JSON
    const serializedPayment = JSON.parse(JSON.stringify(payment));
    return NextResponse.json(serializedPayment, { status: 201 });

  } catch (error: any) {
    console.error("[PAYMENT_POST_ERROR]", error);
    return NextResponse.json({ message: error.message || "Error al registrar pago" }, { status: 500 });
  }
}

export async function GET(req: Request) {
    try {
      const session = await auth();
      if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  
      const payments = await prisma.payment.findMany({
        include: {
          customer: { select: { name: true, doc_number: true } }
        },
        orderBy: { payment_date: "desc" },
        take: 100
      });
  
      return NextResponse.json(payments);
    } catch (error) {
      return NextResponse.json({ message: "Error al obtener pagos" }, { status: 500 });
    }
}
