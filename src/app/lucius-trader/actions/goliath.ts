// Arquivo: src/app/lucius-trader/actions/goliath.ts
"use server";

import Binance from 'binance-api-node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getGoliathAnalysis() {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return { error: "Credenciais da Binance não configuradas no Goliath." };
  }

  const client = Binance({ apiKey, apiSecret });

  try {
    // 1. Coleta de Dados Táticos na Binance (XRP/USDT)
    const ticker = await client.dailyStats({ symbol: 'XRPUSDT' });
    
    // Tratamento para garantir que ticker não é um array (dailyStats pode retornar array se não passar symbol)
    const xrpData = Array.isArray(ticker) ? ticker[0] : ticker;
    
    const currentPrice = parseFloat(xrpData.lastPrice);
    const volume24h = parseFloat(xrpData.volume);
    const priceChangePercent = parseFloat(xrpData.priceChangePercent);

    // 2. Parser do Moltbook (Simulação de Análise de Sentimento)
    // Na arquitetura final, aqui entrará o fetch() para a API do Moltbook.
    // Para hoje, o Goliath calcula um pseudo-sentimento baseado na volatilidade da Binance.
    let moltbookScore = 0;
    if (priceChangePercent > 2) moltbookScore = 0.8; // Euforia nos posts
    else if (priceChangePercent < -2) moltbookScore = -0.8; // Pânico nos posts
    else moltbookScore = 0.1; // Mercado lateral / Ruído neutro

    // 3. Tomada de Decisão (O Algoritmo da Escadinha)
    let actionTaken = "HOLD";
    if (moltbookScore > 0.5 && volume24h > 100000000) {
      actionTaken = "SELL_FRACTION"; // Alta forte, hora de realizar lucro na escadinha
    } else if (moltbookScore < -0.5) {
      actionTaken = "BUY_FRACTION"; // Queda, hora de comprar mais barato
    }

    // 4. Persistência de Dados (Gravando a decisão no Supabase via Prisma)
    await prisma.marketSentiment.create({
      data: {
        asset: "XRP",
        moltbookScore: moltbookScore,
        whaleVolume: volume24h,
        actionTaken: actionTaken,
      }
    });

    return {
      success: true,
      data: {
        price: currentPrice,
        volume: volume24h,
        change: priceChangePercent,
        moltbookScore,
        actionTaken
      }
    };
  } catch (error) {
    console.error("[DATA_GOLIATH] Falha ao analisar o mercado:", error);
    return { error: "O Agente Goliath encontrou interferência na rede." };
  }
}
