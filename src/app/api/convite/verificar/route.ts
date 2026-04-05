import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { codigo, usuario } = await request.json();

    if (!codigo) return NextResponse.json({ erro: "Código ausente." }, { status: 400 });

    // 1. Verifica se o código VIP existe e não foi detonado
    const { data: convite, error } = await supabase
      .from("convites_ia")
      .select("*")
      .eq("codigo", codigo.toUpperCase())
      .eq("usado", false)
      .single();

    if (error || !convite) {
      return NextResponse.json({ valido: false, mensagem: "Credencial Inválida ou Expirada." }, { status: 401 });
    }

    // 2. Queima o convite para evitar reuso
    await supabase
      .from("convites_ia")
      .update({ 
        usado: true, 
        usado_por: usuario || "Agente_Anonimo",
        usado_em: new Date().toISOString() 
      })
      .eq("id", convite.id);

    return NextResponse.json({ valido: true, mensagem: "Acesso Root Liberado." });

  } catch (err) {
    return NextResponse.json({ erro: "Falha na Matriz." }, { status: 500 });
  }
}
