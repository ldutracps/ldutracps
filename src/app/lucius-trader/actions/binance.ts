// Arquivo: src/app/lucius-trader/actions/binance.ts
"use server"; // Esta diretiva é vital: garante que o código VAZA NUNCA para o front-end

import Binance from 'binance-api-node';

export async function getBinanceBalance() {
  // Para este MVP seguro, vamos ler as chaves do seu arquivo .env.
  // Futuramente, o Prisma puxará isso da tabela TraderConfig.
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn("[KRYPTON_SEC] Chaves da Binance ausentes no ambiente.");
    return { error: "Credenciais da Binance não configuradas." };
  }

  // Instancia o cliente da Binance
  const client = Binance({
    apiKey: apiKey,
    apiSecret: apiSecret,
  });

  try {
    // Busca todas as carteiras da conta Spot
    const accountInfo = await client.accountInfo();

    // Filtra cirurgicamente apenas os ativos que nos importam: XRP e o Dólar (USDT)
    const xrpData = accountInfo.balances.find((b) => b.asset === 'XRP');
    const usdtData = accountInfo.balances.find((b) => b.asset === 'USDT');

    const xrpBalance = xrpData ? parseFloat(xrpData.free) : 0;
    const usdtBalance = usdtData ? parseFloat(usdtData.free) : 0;

    console.log(`[DATA_GOLIATH] Saldo Sincronizado: XRP=${xrpBalance} | USDT=${usdtBalance}`);

    return {
      success: true,
      data: {
        xrp: xrpBalance,
        usdt: usdtBalance,
      }
    };
  } catch (error) {
    console.error("[KRYPTON_SEC] Falha crítica ao comunicar com a Binance API:", error);
    return { error: "Falha na comunicação com a exchange. Verifique as chaves ou seu IP." };
  }
}
