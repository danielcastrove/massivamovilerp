import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import * as z from 'zod';
import { ProductType, BillingCycle } from '@prisma/client';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  type: z.nativeEnum(ProductType),
  billing_cycle: z.nativeEnum(BillingCycle).nullable(),
}).refine(data => data.type !== 'RECURRENT' || data.billing_cycle !== null, {
    message: "El ciclo de facturación es obligatorio para productos recurrentes.",
    path: ["billing_cycle"],
});

export async function GET(req: NextRequest) { // Added req: NextRequest
  try {
    const priceListId = req.nextUrl.searchParams.get('priceListId'); // Get priceListId from query params

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
      where: whereClause, // Apply the where clause
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
      },
    });

    // Manually serialize Decimal types to numbers for client-side consumption
    const serializedProducts = products.map(product => {
      // If a specific priceListId is filtered, ensure only those prices are passed
      const filteredPrices = priceListId
        ? product.product_prices.filter(pp => pp.priceListId === priceListId)
        : product.product_prices;

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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = formSchema.parse(body);

    // Check if a product with the same name already exists
    const existingProduct = await prisma.product.findUnique({
      where: { name: validatedData.name },
    });

    if (existingProduct) {
      return NextResponse.json({ error: 'Ya existe un producto con este nombre.' }, { status: 409 });
    }

    const newProduct = await prisma.product.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        billing_cycle: validatedData.billing_cycle,
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
}
