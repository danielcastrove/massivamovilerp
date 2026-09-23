import { NextResponse, NextRequest } from 'next/server';
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

export async function GET(req: NextRequest) {
  return withApiKeyAuth(req, async (_ctx) => {
    try {
      const priceListId = req.nextUrl.searchParams.get('priceListId');

      const whereClause: any = {};
      if (priceListId) {
        whereClause.product_prices = {
          some: {
            priceList: {
              id: priceListId,
            },
          },
        };
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          product_prices: {
            where: priceListId
              ? {
                  priceList: {
                    id: priceListId,
                  },
                }
              : undefined,
            include: {
              priceList: true,
            },
          },
          category: true,
        },
      });

      const serializedProducts = products.map(product => {
        const filteredPrices = product.product_prices;

        return {
          ...product,
          product_prices: filteredPrices.map(pp => ({
            ...pp,
            price_usd: pp.price_usd.toNumber(),
          })),
        };
      });

      return NextResponse.json(serializedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withApiKeyAuth(req, async (_ctx) => {
    try {
      const body = await req.json();
      const validatedData = formSchema.parse(body);

      const existingProduct = await prisma.product.findUnique({
        where: { name: validatedData.name },
      });

      if (existingProduct) {
        return NextResponse.json({ error: 'Ya existe un producto con este nombre.' }, { status: 409 });
      }

      const sku = validatedData.sku || `PROD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      const newProduct = await prisma.product.create({
        data: {
          sku: sku,
          name: validatedData.name,
          type: validatedData.type,
          billing_cycle: validatedData.billing_cycle,
          categoryId: validatedData.categoryId,
        },
      });

      return NextResponse.json(newProduct, { status: 201 });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
      }
      console.error('Error al crear el producto:', error);
      return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
  });
}
