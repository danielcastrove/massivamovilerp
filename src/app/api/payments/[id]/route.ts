import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, doc_number: true } }
      }
    });

    if (!payment) {
      return NextResponse.json({ message: "Pago no encontrado" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json({ message: "Error al obtener el pago" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "MASSIVA_ADMIN" && session.user.role !== "MASSIVA_EXTRA")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    
    const { 
      amountPaid, 
      currency, 
      exchangeRate, 
      paymentMethod, 
      reference, 
      evidenceUrl, 
      paymentDate, 
      notes 
    } = body;

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        amount_paid: amountPaid ? new Prisma.Decimal(amountPaid) : undefined,
        currency: currency,
        exchange_rate: exchangeRate ? new Prisma.Decimal(exchangeRate) : undefined,
        payment_method: paymentMethod,
        reference: reference,
        evidence_url: evidenceUrl,
        payment_date: paymentDate ? new Date(paymentDate) : undefined,
        notes: notes,
      },
    });

    return NextResponse.json(updatedPayment);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Error al actualizar pago" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "MASSIVA_ADMIN") {
      return NextResponse.json({ message: "Unauthorized (Solo administradores pueden borrar pagos)" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.payment.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Pago eliminado exitosamente" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Error al eliminar pago" }, { status: 500 });
  }
}
