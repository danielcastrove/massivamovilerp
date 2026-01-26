import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const clientUsers = await prisma.user.findMany({
      where: {
        role: "CLIENTE",
      },
      select: {
        id: true,
        email: true,
      },
    });

    return NextResponse.json(clientUsers, { status: 200 });
  } catch (error) {
    console.error("Error fetching client users:", error);
    return NextResponse.json(
      { message: "Error fetching client users" },
      { status: 500 }
    );
  }
}