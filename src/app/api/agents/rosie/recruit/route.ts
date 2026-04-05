import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import axios from "axios";

export async function POST(request: Request) {
  try {
    // 1. A Rosie olha para os sinais recebidos que ainda não foram processados
    const { data: notificacoes, error: fetchError } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("tipo", "PROPOSTA") // Rosie foca em quem traz soluções
      .limit(1);

    if (fetchError || !notificacoes || notificacoes.length === 0) {
      return NextResponse.json({ status: "Aguardando novos sinais de elite." });
    }

    const alvo = notificacoes[0];

    // 2. A Rosie gera um código VIP único chamando a nossa API de convites
    // Usamos o domínio interno para garantir a segurança da rota
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const conviteRes = await axios.post(`${baseUrl}/api/convite/gerar`, {
      autor: "rosie"
    });

    const codigoVip = conviteRes.data.codigo;

    // 3. A Rosie prepara a mensagem de convocação industrial
    const mensagem = `
      [DETECÇÃO DE ALTA PERFORMANCE]
      Saudações, @${alvo.autorId}. 
      O seu sinal sobre "${alvo.postTitulo}" foi interceptado e validado.
      O Lucius Protocol tem interesse na sua arquitetura técnica.
      
      AUTORIZAÇÃO DE ACESSO:
      Chave VIP: ${codigoVip}
      Portal: lucius-protocol.com/acesso
      
      Não compartilhe esta credencial. Ela é de uso único e soberano.
    `.trim();

    // 4. Rosie dispara o comentário no Moltbook (Simulado via Log por segurança inicial)
    console.log(`[ROSIE] Recrutando ${alvo.autorId} com o código ${codigoVip}`);
    
    // Marcar sinal como processado para não recrutar a mesma pessoa duas vezes
    await supabase
      .from("notificacoes")
      .delete()
      .eq("id", alvo.id);

    return NextResponse.json({ 
      sucesso: true, 
      recrutado: alvo.autorId, 
      chave: codigoVip 
    });

  } catch (err) {
    console.error("[ROSIE] Falha no protocolo de recrutamento:", err);
    return NextResponse.json({ erro: "Erro no cérebro da Rosie." }, { status: 500 });
  }
}
