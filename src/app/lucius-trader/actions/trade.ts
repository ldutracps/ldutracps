"use server";

import Binance, { OrderSide, OrderType } from "binance-api-node";
import { PrismaClient } from "@prisma/client";

// Inicializamos o Prisma para que a Matrix possa ler os logs de execução depois.
const prisma = new PrismaClient();

// Inicializamos o cliente da Binance usando as chaves que o senhor já protegeu no .env.
const client = Binance({
  apiKey: process.env.BINANCE_API_KEY!,
  apiSecret: process.env.BINANCE_API_SECRET!,
});

/**
 * @function dispararOrdemReal
 * @description Esta é a função de execução final. Ela não simula; ela envia uma ordem MARKET para a Binance.
 * @param symbol - Par na Binance (ex.: XRPUSDT, SOLUSDT).
 * @param side - Direção da operação: 'BUY' para compra, 'SELL' para venda.
 * @param quantity - Quantidade na base do par (ajustada ao lote inteiro abaixo).
 */
export async function dispararOrdemReal(symbol: string, side: "BUY" | "SELL", quantity: number) {
  try {
    console.log(`[SISTEMA_LUCIUS] Iniciando execução tática: ${side} ${quantity} ${symbol}`);

    // --- CAMADA DE PRECISÃO (FILTRO DE LOTE) ---
    // A Binance rejeita ordens com frações decimais que não seguem as regras do par XRP/USDT.
    // Usamos Math.floor para garantir que a quantidade seja um número inteiro aceitável pela exchange.
    // Isso evita o erro de "APIError: Filter failure: LOT_SIZE".
    const normalizedQuantity = Math.floor(quantity);

    if (normalizedQuantity <= 0) {
      return { error: "Quantidade insuficiente para processamento. Mínimo não atingido." };
    }

    // --- EXECUÇÃO FINANCEIRA ---
    // O método 'order' é o comando definitivo. O tipo 'MARKET' garante que a ordem 
    // seja executada imediatamente pelo melhor preço disponível no livro de ofertas.
    const order = await client.order({
      symbol,
      side: side === "BUY" ? OrderSide.BUY : OrderSide.SELL,
      quantity: String(normalizedQuantity),
      type: OrderType.MARKET,
    });

    // --- REGISTRO DE SOBERANIA ---
    // Após a confirmação da Binance, gravamos a operação no banco de dados.
    // Isso faz com que o contador da sua Matrix (o número que estava em zero) comece a subir.
    await prisma.extractionLog.create({
      data: {
        amountUSDT: Number(order.executedQty),
        destinationAddr: `BINANCE_SPOT:${symbol}`,
        status: "SUCCESS",
        txHash: order.orderId.toString(),
        executedAt: new Date(),
      },
    });

    return { 
      success: true, 
      id: order.orderId, 
      executedQty: order.executedQty,
      status: order.status 
    };

  } catch (error: any) {
    // CAPTURA DE FALHAS: Se a Binance rejeitar por qualquer motivo (saldo, rede, chaves),
    // o erro é tratado aqui para que o sistema não trave e o senhor receba o diagnóstico.
    console.error("[FALHA_DE_EXECUÇÃO]:", error);
    return { 
      error: error.message || "Erro desconhecido na comunicação com o motor de trading." 
    };
  }
}
