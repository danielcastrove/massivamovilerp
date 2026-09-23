import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "MASSIVA_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id, created_by: session.user.id },
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
        updated_at: true,
      },
    });

    if (!apiKey) {
      return NextResponse.json({ message: "API key no encontrada" }, { status: 404 });
    }

    return NextResponse.json(apiKey);
  } catch (error) {
    console.error("Error fetching API key:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "MASSIVA_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, allowed_endpoints, is_active, expires_at, rate_limit } = body;

    const existing = await prisma.apiKey.findFirst({
      where: { id, created_by: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ message: "API key no encontrada" }, { status: 404 });
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(allowed_endpoints !== undefined && { allowed_endpoints }),
        ...(is_active !== undefined && { is_active }),
        ...(expires_at !== undefined && { expires_at: expires_at ? new Date(expires_at) : null }),
        ...(rate_limit !== undefined && { rate_limit: rate_limit ? Number(rate_limit) : null }),
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
        updated_at: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating API key:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "MASSIVA_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.apiKey.findFirst({
      where: { id, created_by: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ message: "API key no encontrada" }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id } });

    return NextResponse.json({ message: "API key eliminada" });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
