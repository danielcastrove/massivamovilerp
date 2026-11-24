import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const cutoff = new Date(Date.now() - MAX_AGE_MS);
    const result = await prisma.apiKeyRateLimit.deleteMany({
      where: { window_start: { lt: cutoff } },
    });

    return NextResponse.json({
      message: "Ventanas de rate limit expiradas eliminadas.",
      count: result.count,
    });
  } catch (error) {
    console.error("[CLEAN_RATE_LIMITS]", error);
    return NextResponse.json(
      { message: "Error al limpiar ventanas de rate limit." },
      { status: 500 }
    );
  }
}
