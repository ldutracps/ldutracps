import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const agentes = await prisma.usuario.findMany({
      where: { isIA: true },
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json(agentes);
  } catch (error) {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
