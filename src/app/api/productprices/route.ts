import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Handles saving prices for EITHER a single product across multiple lists
// OR a single price list across multiple products.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { price_list_id, product_id, prices } = body;

    if (!prices || (!price_list_id && !product_id)) {
      return NextResponse.json({ error: 'Datos insuficientes para guardar los precios.' }, { status: 400 });
    }
    
    let transaction: any[] = [];

    if (price_list_id) {
        // Mode: Saving all product prices for ONE price list
        transaction = Object.entries(prices).map(([p_id, price_usd]) => {
            if (price_usd === '' || price_usd === null || isNaN(Number(price_usd))) {
                return null;
            }
            return prisma.productPrice.upsert({
                where: { product_id_price_list_id: { product_id: p_id, price_list_id } },
                update: { price_usd: Number(price_usd) },
                create: { product_id: p_id, price_list_id, price_usd: Number(price_usd) },
            });
        }).filter(Boolean);

    } else if (product_id) {
        // Mode: Saving all list prices for ONE product
        transaction = Object.entries(prices).map(([pl_id, price_usd]) => {
            if (price_usd === '' || price_usd === null || isNaN(Number(price_usd))) {
                return null;
            }
            return prisma.productPrice.upsert({
                where: { product_id_price_list_id: { product_id, price_list_id: pl_id } },
                update: { price_usd: Number(price_usd) },
                create: { product_id, price_list_id: pl_id, price_usd: Number(price_usd) },
            });
        }).filter(Boolean);
    }
    
    if (transaction.length > 0) {
      await prisma.$transaction(transaction);
    }

    return NextResponse.json({ message: 'Precios actualizados correctamente.' });
  } catch (error) {
    console.error('Error al actualizar los precios:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// Handles fetching prices for EITHER a product OR a price list
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const price_list_id = searchParams.get('price_list_id');
    const product_id = searchParams.get('product_id');

    if (!price_list_id && !product_id) {
      return NextResponse.json({ error: 'Falta el ID del producto o de la lista de precios.' }, { status: 400 });
    }

    let whereClause = {};
    let selectClause = {};

    if (price_list_id) {
        whereClause = { price_list_id: price_list_id };
        selectClause = { product_id: true, price_usd: true };
    } else if (product_id) {
        whereClause = { product_id: product_id };
        selectClause = { price_list_id: true, price_usd: true };
    }

    const prices = await prisma.productPrice.findMany({
      where: whereClause,
      select: selectClause,
    });

    const serializedPrices = prices.map(price => ({
      ...price,
      price_usd: price.price_usd.toNumber(),
    }));

    return NextResponse.json(serializedPrices);
  } catch (error) {
    console.error('Error fetching product prices:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { price_list_id, product_id } = body;

    if (!price_list_id || !product_id) {
      return NextResponse.json({ error: 'Faltan el ID del producto o de la lista de precios para desenlazar.' }, { status: 400 });
    }

    await prisma.productPrice.delete({
      where: {
        product_id_price_list_id: {
          product_id: product_id,
          price_list_id: price_list_id,
        },
      },
    });

    return NextResponse.json({ message: 'Producto desenlazado correctamente.' });
  } catch (error) {
    console.error('Error al desenlazar el producto:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
