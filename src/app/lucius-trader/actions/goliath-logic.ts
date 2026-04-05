"use server";

import { dispararOrdemReal } from "./trade";
import { obterDadosReais, type RadarDadosOk } from "./get-data";
// IMPORTAÇÃO NOVA: O Radar Social do Senhor Wayne
import { calcularSentimentoMoltbook } from "./moltbook-radar";
import { precosBinanceComoRecord } from "@/lib/binance-prices";
import Binance from "binance-api-node";

const client = Binance({
  apiKey: process.env.BINANCE_API_KEY!,
  apiSecret: process.env.BINANCE_API_SECRET!,
});

// A MATRIZ DE ALVOS (A sua XRP continua isolada e protegida)
const ALVOS_SCALPING = ['SOL', 'ADA', 'DOGE', 'BNB', 'TRX', 'AVAX', 'DOT', 'LINK', 'LTC', 'NEAR'];

/**
 * @param radarJaCarregado — Se vier do mesmo ciclo que já chamou obterDadosReais(), evita
 *   duplicar accountInfo/prices/candles e reduz risco de ban por rate limit (418/-1003).
 */
export async function processarSinalGoliath(radarJaCarregado?: RadarDadosOk) {
  try {
    const agora = new Date().toLocaleTimeString('pt-BR');

    // 1. LEITURA DA MUNIÇÃO (reutiliza radar do cliente quando existir)
    const sensores = radarJaCarregado ?? (await obterDadosReais());
    if (!sensores.success) {
      const detalhe =
        "error" in sensores && sensores.error
          ? String(sensores.error).slice(0, 180)
          : "sem detalhe";
      return {
        msg: `[${agora}] ERRO: Radar cego (${detalhe}). Verifique chaves Binance, IP na allowlist e rede.`,
        variant: "error",
        acao: false,
      };
    }

    const ativosNaCarteira = sensores.ativos ?? [];
    const ativoUSDT = ativosNaCarteira.find((a: { coin: string }) => a.coin === "USDT");
    const saldoUSDT = ativoUSDT ? parseFloat(ativoUSDT.amount) : 0;

    const tickerGeral = precosBinanceComoRecord(await client.prices());

    // ============================================================================
    // 2. LÓGICA DE VENDA RÁPIDA (Realização de Lucro)
    // ============================================================================
    for (const moeda of ALVOS_SCALPING) {
      const par = `${moeda}USDT`;
      const naCarteira = ativosNaCarteira.find((a: { coin: string }) => a.coin === moeda);
      
      // Se houver mais de $5 investidos nesta moeda
      if (naCarteira && (parseFloat(naCarteira.amount) * parseFloat(tickerGeral[par])) > 5) {
        const precoAtual = parseFloat(tickerGeral[par]);
        
        const historicoTrades = await client.myTrades({ symbol: par, limit: 1 });
        const ultimoPrecoCompra = historicoTrades.length > 0 && historicoTrades[0].isBuyer 
                                  ? parseFloat(historicoTrades[0].price) 
                                  : precoAtual;

        // Margem de lucro segura (1.5% de alta para bater as taxas da Binance)
        const alvoDeVenda = ultimoPrecoCompra * 1.015;

        if (precoAtual >= alvoDeVenda) {
           const qtdVender = parseFloat(naCarteira.amount);
           const execucao = await dispararOrdemReal(par, 'SELL', qtdVender);
           
           if (execucao.success) {
             return { 
               msg: `[${agora}] SCALP WIN! ${moeda} vendida a $${precoAtual.toFixed(4)}. Lucro garantido no caixa USDT.`, 
               variant: "success", acao: true 
             };
           }
        }
      }
    }

    // ============================================================================
    // 3. LÓGICA DE COMPRA (Ataque com Proteção do Moltbook)
    // ============================================================================
    if (saldoUSDT > 15) {
      let maiorOportunidade: {
        par: string;
        moeda: string;
        preco: number;
      } | null = null;
      let piorQueda = 0;

      for (const moeda of ALVOS_SCALPING) {
        const par = `${moeda}USDT`;
        const stats = await client.dailyStats({ symbol: par });

        if (stats) {
          const variacao24h = parseFloat(stats.priceChangePercent);
          if (variacao24h < piorQueda) {
            piorQueda = variacao24h;
            const s = stats as { lastPrice?: string; curDayClose: string };
            maiorOportunidade = {
              par: par,
              moeda: moeda,
              preco: parseFloat(s.lastPrice ?? s.curDayClose),
            };
          }
        }
      }

      // Se detetámos uma queda brusca (maior que 2%)
      if (maiorOportunidade && piorQueda <= -2.0) {
        
        // ------------------------------------------------------------------------
        // A TRAVA DE SEGURANÇA: CONSULTA AO MOLTBOOK
        // ------------------------------------------------------------------------
        const sentimento = await calcularSentimentoMoltbook(maiorOportunidade.moeda);
        
        // Se a nota for menor que 40, a rede social detetou pânico ou scam.
        if (sentimento.score < 40) {
          return { 
            msg: `[${agora}] TIRO ABORTADO: ${maiorOportunidade.moeda} a cair (${piorQueda}%), mas o Moltbook indica PÂNICO (Score: ${sentimento.score}).`, 
            variant: "error", acao: false 
          };
        }

        // Se a nota for boa (houver "foguetes" ou otimismo), o robô tem permissão para atirar
        const orcamentoTiro = 12; // Gasta apenas 12 Dólares por tiro
        const qtdComprar = orcamentoTiro / maiorOportunidade.preco;

        const execucao = await dispararOrdemReal(maiorOportunidade.par, 'BUY', qtdComprar);
        
        if (execucao.success) {
          return { 
            msg: `[${agora}] ATAQUE CONFIRMADO! ${maiorOportunidade.moeda} em queda (${piorQueda}%) + Hype Moltbook (${sentimento.score}/100). Comprado $12 USDT.`, 
            variant: "success", acao: true 
          };
        }
      }
    }

    // ============================================================================
    // 4. MODO DE RASTREIO CONTÍNUO
    // ============================================================================
    return { 
      msg: `[${agora}] Radares limpos. Munição: $ ${saldoUSDT.toFixed(2)} USDT. A varrer o mercado e a rede social.`,
      variant: "neutral", acao: false
    };

  } catch (error) {
    console.error("Falha Crítica no Kernel Goliath:", error);
    return { msg: "ERRO DE KERNEL: Pane nos sistemas de comunicação.", variant: "error", acao: false };
  }
}
