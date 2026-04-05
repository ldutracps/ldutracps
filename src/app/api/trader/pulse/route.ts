// Arquivo: src/app/api/trader/pulse/route.ts
import { NextResponse } from "next/server";
import { getGoliathAnalysis } from "@/app/lucius-trader/actions/goliath";
import { getKryptonStatus } from "@/app/lucius-trader/actions/krypton";

/**
 * MÓDULO: MARCAPASSO DO ROBÔ (PULSE)
 * Este endpoint é o coração do sistema autônomo.
 */
export async function GET(request: Request) {
  // 1. Verificação de Segurança (Blindagem de Cabeçalho)
  // O Cron precisa enviar esta chave no Header para ser autorizado.
  const authHeader = request.headers.get("x-lucius-secret");
  const LUCIUS_SECRET = process.env.LUCIUS_CRON_SECRET || "bat-signal-2026";

  if (authHeader !== LUCIUS_SECRET) {
    console.error("[KRYPTON_SEC] Tentativa de disparo não autorizada no Pulse.");
    return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });
  }

  try {
    console.log("[DATA_GOLIATH] Pulso recebido. Iniciando ciclo de análise...");

    // 2. Verificação Fiscal (Krypton_Sec)
    // Antes de analisar o mercado, verificamos se ainda temos margem nos R$ 5.000,00
    const krypton = await getKryptonStatus();
    
    if (!krypton.success || krypton.data?.isShieldActive) {
      console.warn("[KRYPTON_SEC] Ciclo interrompido: Limite fiscal atingido ou erro de leitura.");
      return NextResponse.json({ 
        status: "IDLE", 
        reason: "Fiscal Shield Active or Error" 
      });
    }

    // 3. Execução da Análise e Decisão (Data_Goliath)
    // Aqui o Goliath lê a Binance, o Moltbook e grava a decisão no Prisma.
    const analysis = await getGoliathAnalysis();

    if (!analysis.success) {
      throw new Error(analysis.error || "Erro desconhecido na análise");
    }

    console.log(`[DATA_GOLIATH] Ciclo concluído com sucesso. Ação sugerida: ${analysis.data?.actionTaken}`);

    return NextResponse.json({
      status: "SUCCESS",
      timestamp: new Date().toISOString(),
      action: analysis.data?.actionTaken,
      xrpPrice: analysis.data?.price
    });

  } catch (error: any) {
    console.error("[LUCIUS_CRITICAL] Falha no ciclo do marcapasso:", error.message);
    return NextResponse.json({ error: "Erro interno no processamento do pulso" }, { status: 500 });
  }
}
