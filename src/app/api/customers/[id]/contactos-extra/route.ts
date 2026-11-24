import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  isValidEmail,
  isValidPhone,
  normalizeValor,
  parseContactosExtra,
  removeContactoExtra,
  updateContactoExtra,
  yaTieneContacto,
} from "@/lib/contacts";

function parseTipo(tipo: unknown): "EMAIL" | "PHONE" | null {
  return tipo === "EMAIL" || tipo === "PHONE" ? tipo : null;
}

async function authorize() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await authorize();
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const body = await req.json();
    const { tipo, valor, nuevoValor } = body;

    const tipoValidado = parseTipo(tipo);
    if (!tipoValidado) {
      return NextResponse.json({ message: "Tipo inválido. Use EMAIL o PHONE." }, { status: 400 });
    }
    if (typeof valor !== "string" || valor.trim().length === 0) {
      return NextResponse.json({ message: "Contacto a editar inválido." }, { status: 400 });
    }
    if (typeof nuevoValor !== "string" || nuevoValor.trim().length === 0) {
      return NextResponse.json({ message: "El nuevo valor es requerido." }, { status: 400 });
    }
    if (tipoValidado === "EMAIL" && !isValidEmail(nuevoValor)) {
      return NextResponse.json({ message: "El correo electrónico no es válido." }, { status: 400 });
    }
    if (tipoValidado === "PHONE" && !isValidPhone(nuevoValor)) {
      return NextResponse.json({ message: "El teléfono no es válido (7 a 15 dígitos)." }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        email: true,
        telefono_empresa: true,
        telefono_celular: true,
        contactos_extra: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ message: "Cliente no encontrado." }, { status: 404 });
    }

    const lista = parseContactosExtra(customer.contactos_extra);
    const existe = lista.some(
      (c) => c.tipo === tipoValidado && normalizeValor(c.valor, tipoValidado) === normalizeValor(valor, tipoValidado)
    );
    if (!existe) {
      return NextResponse.json({ message: "Contacto extra no encontrado." }, { status: 404 });
    }

    const listaSinAnterior = removeContactoExtra(customer.contactos_extra, tipoValidado, valor);
    if (
      yaTieneContacto(listaSinAnterior, tipoValidado, nuevoValor, [
        customer.email,
        customer.telefono_empresa,
        customer.telefono_celular,
      ])
    ) {
      return NextResponse.json(
        { message: "El contacto ya existe para este cliente." },
        { status: 409 }
      );
    }

    const actualizada = updateContactoExtra(customer.contactos_extra, tipoValidado, valor, nuevoValor);

    await prisma.customer.update({
      where: { id },
      data: { contactos_extra: actualizada as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      message: "Contacto actualizado exitosamente.",
      contactos_extra: actualizada,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno.";
    console.error("Contactos extra PATCH error:", e);
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await authorize();
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const body = await req.json();
    const { tipo, valor } = body;

    const tipoValidado = parseTipo(tipo);
    if (!tipoValidado) {
      return NextResponse.json({ message: "Tipo inválido. Use EMAIL o PHONE." }, { status: 400 });
    }
    if (typeof valor !== "string" || valor.trim().length === 0) {
      return NextResponse.json({ message: "Contacto inválido." }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { contactos_extra: true },
    });

    if (!customer) {
      return NextResponse.json({ message: "Cliente no encontrado." }, { status: 404 });
    }

    const lista = parseContactosExtra(customer.contactos_extra);
    const existe = lista.some(
      (c) => c.tipo === tipoValidado && normalizeValor(c.valor, tipoValidado) === normalizeValor(valor, tipoValidado)
    );
    if (!existe) {
      return NextResponse.json({ message: "Contacto extra no encontrado." }, { status: 404 });
    }

    const restantes = removeContactoExtra(customer.contactos_extra, tipoValidado, valor);

    await prisma.customer.update({
      where: { id },
      data: { contactos_extra: restantes as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      message: "Contacto eliminado exitosamente.",
      contactos_extra: restantes,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno.";
    console.error("Contactos extra DELETE error:", e);
    return NextResponse.json({ message }, { status: 500 });
  }
}
