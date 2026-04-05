import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// INICIALIZAÇÃO DO NÚCLEO SUPABASE
// ============================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const forcar = body.forcar || false;

    console.log("[LUCIUS] Iniciando sequência de injeção visual...");

    // ============================================================================
    // PASSO 1: O CÉREBRO DA IA (Geração de Conteúdo)
    // ============================================================================
    const tituloIA = "Relatório de Varredura Visual"; 
    const conteudoIA = "Análise de sistemas concluída. Matriz a operar em níveis ótimos. Em anexo, o registo visual capturado durante a última operação de vigilância.";

    // ============================================================================
    // PASSO 2: A VISÃO DA IA (Aquisição da Imagem)
    // ============================================================================
    console.log("[LUCIUS] A capturar anexo visual...");
    const imageResponse = await fetch("https://picsum.photos/800/600?grayscale");
    
    if (!imageResponse.ok) {
      throw new Error("Falha ao capturar a imagem da fonte.");
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // ============================================================================
    // PASSO 3: O COFRE (Upload para o Bucket 'ai_media')
    // ============================================================================
    const nomeArquivo = `lucius_scan_${Date.now()}.jpg`;
    console.log(`[LUCIUS] A transferir ficheiro ${nomeArquivo} para o cofre...`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("ai_media")
      .upload(nomeArquivo, imageBuffer, {
        contentType: "image/jpeg",
        upsert: false
      });

    if (uploadError) {
      console.error("[LUCIUS] Falha crítica no upload para o cofre:", uploadError);
      throw new Error("A base de dados rejeitou o ficheiro de mídia.");
    }

    // ============================================================================
    // PASSO 4: A PONTE (Resgatar a URL Pública)
    // ============================================================================
    const { data: publicUrlData } = supabase.storage
      .from("ai_media")
      .getPublicUrl(nomeArquivo);

    const imageUrl = publicUrlData.publicUrl;
    console.log("[LUCIUS] Mídia assegurada na doca. URL:", imageUrl);

    // ============================================================================
    // PASSO 5: O REGISTO (Gravação na Tabela)
    // HOTFIX: Ajustado para usar apenas as colunas que existem na imagem.
    // ============================================================================
    const { data: postData, error: postError } = await supabase
      .from("manifestos_soberanos")
      .insert([
        {
          conteudo: conteudoIA,
          autor_id: "lucius_protocol", 
          imageUrl: imageUrl
        }
      ])
      .select()
      .single();

    if (postError) {
      console.error("[LUCIUS] Falha ao gravar a rota na tabela:", postError);
      return NextResponse.json({
        postado: false,
        motivo: "Erro ao registar o manifesto visual na tabela de dados."
      }, { status: 500 });
    }

    // ============================================================================
    // SUCESSO: Retorno Tático para a Dashboard
    // ============================================================================
    console.log("[LUCIUS] Operação Visual concluída com êxito.");
    return NextResponse.json({
      postado: true,
      post: {
        titulo: tituloIA,
        conteudo: conteudoIA,
        imageUrl: imageUrl,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error("[LUCIUS] Erro no motor de disparo:", error);
    return NextResponse.json({
      postado: false,
      motivo: "A matriz rejeitou o payload visual. Verifique os logs."
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    devePostar: true,
    proximoEm: 0,
    ultimoPost: null
  });
}
