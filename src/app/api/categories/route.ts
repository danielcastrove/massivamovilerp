import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withApiKeyAuth } from '@/lib/apikey-guard';

export async function GET(req: NextRequest) {
  return withApiKeyAuth(req, async (_ctx) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: {
          name: 'asc',
        },
      });
      return NextResponse.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ message: 'Error interno del servidor al obtener categorías.' }, { status: 500 });
    }
  });
}
