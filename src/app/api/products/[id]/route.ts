import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as z from 'zod';
import { ProductType, BillingCycle } from '@prisma/client';

const formSchema = z.object({

  name: z.string().min(2, {

    message: "El nombre debe tener al menos 2 caracteres.",

  }),

  type: z.nativeEnum(ProductType),

  billing_cycle: z.nativeEnum(BillingCycle).nullable(),

  categoryId: z.string().min(1, {

    message: "La categoría es obligatoria.",

  }),

}).refine(data => data.type !== 'RECURRENT' || data.billing_cycle !== null, {

    message: "El ciclo de facturación es obligatorio para productos recurrentes.",

    path: [

      "billing_cycle"

    ],

});



export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {

      return NextResponse.json({ error: 'ID de producto no proporcionado.' }, { status: 400 });

    }



    const body = await req.json();

    const validatedData = formSchema.parse(body);



    // Check if a product with the same name already exists, excluding the current one

    const existingProduct = await prisma.product.findFirst({

      where: { 

        name: validatedData.name,

        id: { not: id }

      },

    });



    if (existingProduct) {

      return NextResponse.json({ error: 'Ya existe otro producto con este nombre.' }, { status: 409 });

    }



    const updatedProduct = await prisma.product.update({

      where: { id: id },

      data: {

        name: validatedData.name,

        type: validatedData.type,

        billing_cycle: validatedData.billing_cycle,

        categoryId: validatedData.categoryId,

      },

    });

    return NextResponse.json(updatedProduct, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Error al actualizar el producto:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID de producto no proporcionado.' }, { status: 400 });
    }

    // Use a transaction to ensure both operations succeed or fail together
    await prisma.$transaction([
      // Delete all related product prices first
      prisma.productPrice.deleteMany({
        where: { product_id: id },
      }),
      // Then delete the product itself
      prisma.product.delete({
        where: { id: id },
      }),
    ]);

    return NextResponse.json({ message: 'Producto eliminado correctamente.' }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
      }
    console.error('Error al eliminar el producto:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
