import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = formSchema.parse(body);

    // Check if a price list with the same name already exists
    const existingPriceList = await prisma.priceList.findUnique({
      where: { name },
    });

    if (existingPriceList) {
      return NextResponse.json({ error: 'Ya existe una lista de precios con este nombre.' }, { status: 409 });
    }

    const newPriceList = await prisma.priceList.create({
      data: { name },
    });

    return NextResponse.json(newPriceList, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Error al crear la lista de precios:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const priceLists = await prisma.priceList.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    return NextResponse.json(priceLists);
  } catch (error) {
    console.error('Error fetching price lists:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}