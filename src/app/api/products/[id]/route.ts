import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApiKeyAuth } from '@/lib/apikey-guard';
import * as z from 'zod';
import { ProductType, BillingCycle } from '@prisma/client';

const formSchema = z.object({
  sku: z.string().optional(),
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
    path: ["billing_cycle"],
});



export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(req, async (_ctx) => {
    try {
      const { id } = await params;

      if (!id) {
        return NextResponse.json({ error: 'ID de producto no proporcionado.' }, { status: 400 });
      }

      const body = await req.json();
      const validatedData = formSchema.parse(body);

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
          ...(validatedData.sku && { sku: validatedData.sku }),
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
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(req, async (_ctx) => {
    try {
      const { id } = await params;
      if (!id) {
        return NextResponse.json({ error: 'ID de producto no proporcionado.' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.productPrice.deleteMany({
          where: { product_id: id },
        });
        await tx.lead.updateMany({
          where: { productId: id },
          data: { productId: null },
        });
        await tx.invoiceItem.updateMany({
          where: { product_id: id },
          data: { product_id: null },
        });
        await tx.product.delete({
          where: { id: id },
        });
      });

      return NextResponse.json({ message: 'Producto eliminado correctamente.' }, { status: 200 });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
      }
      console.error('Error al eliminar el producto:', error);
      return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
  });
}
