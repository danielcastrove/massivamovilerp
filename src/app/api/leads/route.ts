import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as z from "zod";
import { LeadSource, LeadStatus, LeadType } from "@prisma/client";

const leadSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  cedula: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  productId: z.string().optional().nullable(),
  priceListId: z.string().optional().nullable(),
  custom_product: z.string().optional().nullable(),
  procedencia: z.nativeEnum(LeadSource),
  comentarios: z.string().optional(),
  fecha_llamada: z.string().optional().nullable(),
  status: z.nativeEnum(LeadStatus).default("SIN_CONTACTAR"),
  tipo_lead: z.nativeEnum(LeadType).default("NORMAL"),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const leads = await prisma.lead.findMany({
      include: {
        product: { select: { name: true } },
        priceList: { select: { name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ message: "Error al obtener leads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const validatedData = leadSchema.parse(body);

    const newLead = await prisma.lead.create({
      data: {
        ...validatedData,
        fecha_llamada: validatedData.fecha_llamada ? new Date(validatedData.fecha_llamada) : null,
      }
    });

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error creating lead:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
