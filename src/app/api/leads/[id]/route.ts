import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as z from "zod";

const leadUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  apellido: z.string().min(1).optional(),
  cedula: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  productId: z.string().optional().nullable(),
  priceListId: z.string().optional().nullable(),
  custom_product: z.string().optional().nullable(),
  procedencia: z.string().optional(),
  comentarios: z.string().optional(),
  fecha_llamada: z.string().optional().nullable(),
  status: z.string().optional(),
  tipo_lead: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validatedData = leadUpdateSchema.parse(body);

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        ...validatedData,
        fecha_llamada: validatedData.fecha_llamada ? new Date(validatedData.fecha_llamada) : null,
      },
    });

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ message: "Error al actualizar el prospecto" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Prospecto eliminado con éxito" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ message: "Error al eliminar el prospecto" }, { status: 500 });
  }
}
