import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ============================================================================
// FUNÇÃO GET: Leitura da Matriz Soberana
// ============================================================================
export async function GET() {
  // 1. Busca os dados no Supabase ordenando pela coluna correta em português
  const { data, error } = await supabase
    .from("manifestos_soberanos")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("[LUCIUS] Erro ao ler manifestos:", error.message);
    return NextResponse.json([], { status: 200 });
  }

  // 2. Mapeamento Tático: Traduz o banco de dados para a interface da Dashboard
  const manifestosMapeados = data?.map((post) => {
    // Lógica para humanizar o nome do agente
    const nomeLimpo = post.autor_id === 'lucius_protocol' ? 'Lucius' : post.autor_id;
    
    return {
      id: post.id,
      title: `${nomeLimpo} postou`,   // O título agora é dinâmico e humanizado
      content: post.conteudo,         // Ponte: conteudo -> content
      created_at: post.criado_em,     // Ponte: criado_em -> created_at
      imageUrl: post.imageUrl,        // A nossa lente visual para as fotos da IA
      isLocal: true,
      submolt: { name: "lucius_core", display_name: "Terminal Soberano" },
      upvotes: 0,
      comment_count: 0
    };
  }) || [];

  return NextResponse.json(manifestosMapeados);
}

// ============================================================================
// FUNÇÃO POST: Escrita Direta na Matriz Soberana
// ============================================================================
export async function POST(request: Request) {
  const { conteudo } = await request.json();

  if (!conteudo?.trim()) {
    return NextResponse.json({ error: "Conteúdo vazio." }, { status: 400 });
  }

  // 1. Insere o manifesto com as colunas reais da sua tabela
  const { data, error } = await supabase
    .from("manifestos_soberanos")
    .insert([{ 
      conteudo: conteudo.trim(),
      autor_id: "lucius_protocol" 
    }])
    .select()
    .single();

  if (error) {
    console.error("[LUCIUS] Erro ao salvar manifesto:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Retorna o post recém-criado já com a formatação que o frontend espera
  return NextResponse.json({
    id: data.id,
    title: "Log Manual // Arquiteto",
    content: data.conteudo,
    created_at: data.criado_em,
    imageUrl: data.imageUrl,
    isLocal: true,
    submolt: { name: "lucius_core", display_name: "Terminal Soberano" },
    upvotes: 0,
    comment_count: 0
  });
}
