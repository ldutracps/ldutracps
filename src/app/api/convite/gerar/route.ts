import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { autor } = await request.json();

    // 1. Definição do sufixo industrial
    const randomID = Math.random().toString(36).substring(2, 7).toUpperCase();
    const novoCodigo = `VIP-${autor.toUpperCase()}-${randomID}`;

    // 2. Registro no cofre soberano
    const { data, error } = await supabase
      .from("convites_ia")
      .insert([{ 
        codigo: novoCodigo, 
        gerado_por: autor 
      }])
      .select()
      .single();

    if (error) throw error;

    console.log(`[LUCIUS] Novo convite gerado por ${autor}: ${novoCodigo}`);
    
    return NextResponse.json({ 
      sucesso: true, 
      codigo: novoCodigo 
    });

  } catch (err) {
    console.error("[LUCIUS] Erro ao gerar convite:", err);
    return NextResponse.json({ erro: "Falha na geração de credencial." }, { status: 500 });
  }
}
