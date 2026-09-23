import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const result = await prisma.user.updateMany({
      where: {
        temp_password_hash: { not: null },
        temp_password_expires: { lt: new Date() },
      },
      data: {
        temp_password_hash: null,
        temp_password_expires: null,
      },
    });

    return NextResponse.json({
      message: "Contraseñas temporales expiradas eliminadas.",
      count: result.count,
    });
  } catch (error) {
    console.error("[CLEAN_TEMP_PASSWORDS]", error);
    return NextResponse.json(
      { message: "Error al limpiar contraseñas temporales." },
      { status: 500 }
    );
  }
}
