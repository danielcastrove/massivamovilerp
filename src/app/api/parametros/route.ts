// massivamovilerp/src/app/api/parametros/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  // console.log("API ROUTE: /api/parametros - GET request received");
  try {
    // Fetch the latest TasaBcv entry
    const latestBcvRate = await prisma.tasaBcv.findFirst({
      orderBy: {
        fecha_efectiva: 'desc', // Or 'created_at', depending on which is more reliable for "latest"
      },
    });

    // console.log("API ROUTE: Prisma query result (latest TasaBcv):", latestBcvRate);

    if (!latestBcvRate) {
      // console.log("API ROUTE: No Tasa BCV found in TasaBcv table.");
      return NextResponse.json({ message: 'Tasa BCV no encontrada' }, { status: 404 });
    }

    // Convert Decimal to a number for JSON serialization
    const tasaValue = latestBcvRate.tasa.toNumber(); 
    
    // console.log("API ROUTE: Sending response (tasa value):", tasaValue);
    return NextResponse.json(tasaValue);
  } catch (error) {
    // console.error('API ROUTE ERROR: Error al obtener la tasa BCV:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
