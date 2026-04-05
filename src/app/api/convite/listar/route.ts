import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // 1. Busca todos os convites gerados e ordena dos mais recentes para os mais antigos
    const { data, error } = await supabase
      .from("convites_ia")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("[LUCIUS] Falha na varredura do cofre VIP:", error.message);
      return NextResponse.json({ erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ convites: data }, { status: 200 });

  } catch (error) {
    console.error("[LUCIUS] Erro crítico no monitor VIP:", error);
    return NextResponse.json({ erro: "Falha interna." }, { status: 500 });
  }
}
