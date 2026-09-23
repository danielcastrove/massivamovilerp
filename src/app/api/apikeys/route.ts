import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createHash, randomBytes } from "crypto";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "MASSIVA_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { created_by: session.user.id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        description: true,
        allowed_endpoints: true,
        is_active: true,
        expires_at: true,
        rate_limit: true,
        created_at: true,
      },
    });

    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "MASSIVA_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, allowed_endpoints, expires_at, rate_limit } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ message: "Nombre es requerido" }, { status: 400 });
    }

    if (!allowed_endpoints || !Array.isArray(allowed_endpoints) || allowed_endpoints.length === 0) {
      return NextResponse.json({ message: "Al menos un endpoint es requerido" }, { status: 400 });
    }

    // Generate API key: sk- + 48 hex chars
    const rawKey = "sk-" + randomBytes(24).toString("hex");
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 12) + "...";

    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        key_hash: keyHash,
        key_prefix: keyPrefix,
        description: description?.trim() || null,
        allowed_endpoints,
        is_active: true,
        expires_at: expires_at ? new Date(expires_at) : null,
        rate_limit: rate_limit ? Number(rate_limit) : null,
        created_by: session.user.id,
      },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        description: true,
        allowed_endpoints: true,
        is_active: true,
        expires_at: true,
        rate_limit: true,
        created_at: true,
      },
    });

    // Return the raw key ONLY this one time
    return NextResponse.json({ ...apiKey, raw_key: rawKey });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
