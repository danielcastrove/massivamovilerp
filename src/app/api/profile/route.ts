import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validations/profile";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        telefono_celular: true,
        cargo: true,
        role: true,
        is_active: true,
        created_at: true,
        roles: { select: { id: true, name: true } },
        Customer: { select: { id: true, name: true, doc_number: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        created_at: user.created_at.toISOString(),
      },
    });
  } catch (e) {
    console.error("Error fetching profile:", e);
    return NextResponse.json({ message: "Error interno." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        nombre: data.nombre,
        apellido: data.apellido || null,
        telefono_celular: data.telefono_celular || null,
        cargo: data.cargo || null,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        telefono_celular: true,
        cargo: true,
      },
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error("Error updating profile:", e);
    return NextResponse.json({ message: "Error interno." }, { status: 500 });
  }
}