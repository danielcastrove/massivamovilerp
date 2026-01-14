import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // <-- Debe ser Promise aquí
) {
  try {
    const { id } = await params; // <-- Y await aquí
    if (!id) {
      return NextResponse.json({ error: 'ID de lista de precios no proporcionado.' }, { status: 400 });
    }

    const body = await req.json();
    const { name } = formSchema.parse(body);

    // Check if a price list with the same name already exists, excluding the current one
    const existingPriceList = await prisma.priceList.findFirst({
      where: { 
        name,
        id: { not: id }
      },
    });

    if (existingPriceList) {
      return NextResponse.json({ error: 'Ya existe otra lista de precios con este nombre.' }, { status: 409 });
    }

    const updatedPriceList = await prisma.priceList.update({
      where: { id: id },
      data: { name },
    });

    return NextResponse.json(updatedPriceList, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Error al actualizar la lista de precios:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // <-- Debe ser Promise aquí
) {
  try {
    const { id } = await params; // <-- Y await aquí
    if (!id) {
      return NextResponse.json({ error: 'ID de lista de precios no proporcionado.' }, { status: 400 });
    }

    await prisma.priceList.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: 'Lista de precios eliminada correctamente.' }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Error al eliminar la lista de precios:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

