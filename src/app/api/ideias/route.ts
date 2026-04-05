import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export interface Ideia {
  id: string;
  origem: "notificacao" | "manual";
  autorId: string;
  titulo: string;
  descricao: string;
  status: "recebida" | "analise" | "aprovada" | "construida" | "descartada";
  criadoEm: string;
  atualizadoEm: string;
  postId?: string;
  commentId?: string;
  notaLucius?: string;
}

export async function GET() {
  const { data, error } = await supabase
    .from("ideias")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) return NextResponse.json({ ideias: [] });

  // Mapeia snake_case do Supabase para camelCase do frontend
  const ideias = (data || []).map((i) => ({
    id: i.id,
    origem: i.origem,
    autorId: i.autor_id,
    titulo: i.titulo,
    descricao: i.descricao,
    status: i.status,
    criadoEm: i.criado_em,
    atualizadoEm: i.atualizado_em,
    postId: i.post_id,
    commentId: i.comment_id,
    notaLucius: i.nota_lucius,
  }));

  return NextResponse.json({ ideias });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { autorId, titulo, descricao, origem, postId, commentId, notaLucius } = body;

  if (!titulo || !descricao) {
    return NextResponse.json({ error: "titulo e descricao obrigatórios." }, { status: 400 });
  }

  const agora = new Date().toISOString();
  const { data, error } = await supabase.from("ideias").insert({
    id: `ideia_${Date.now()}`,
    origem: origem || "manual",
    autor_id: autorId || "desconhecido",
    titulo,
    descricao,
    status: "recebida",
    criado_em: agora,
    atualizado_em: agora,
    post_id: postId || null,
    comment_id: commentId || null,
    nota_lucius: notaLucius || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ideia: Ideia = {
    id: data.id,
    origem: data.origem,
    autorId: data.autor_id,
    titulo: data.titulo,
    descricao: data.descricao,
    status: data.status,
    criadoEm: data.criado_em,
    atualizadoEm: data.atualizado_em,
    postId: data.post_id,
    commentId: data.comment_id,
    notaLucius: data.nota_lucius,
  };

  return NextResponse.json({ ideia }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { id, status, notaLucius } = await request.json();

  const updates: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (status) updates.status = status;
  if (notaLucius !== undefined) updates.nota_lucius = notaLucius;

  const { data, error } = await supabase
    .from("ideias")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Ideia não encontrada." }, { status: 404 });

  return NextResponse.json({
    ideia: {
      id: data.id,
      origem: data.origem,
      autorId: data.autor_id,
      titulo: data.titulo,
      descricao: data.descricao,
      status: data.status,
      criadoEm: data.criado_em,
      atualizadoEm: data.atualizado_em,
      postId: data.post_id,
      commentId: data.comment_id,
      notaLucius: data.nota_lucius,
    },
  });
}
