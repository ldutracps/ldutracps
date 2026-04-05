"use server";

import Binance from 'binance-api-node';
import { PrismaClient } from '@prisma/client';

// Inicialização do Prisma e do Cliente da Binance
const prisma = new PrismaClient();
const client = Binance({
  apiKey: process.env.BINANCE_API_KEY!,
  apiSecret: process.env.BINANCE_API_SECRET!,
});

/**
 * @function executarProtocoloExtracao
 * @description Transfere ativos reais da Binance para uma carteira externa (Desintermediação).
 */
export async function executarProtocoloExtracao(
  asset: string,      // Ex: 'XRP' ou 'USDT'
  amount: number,     // Quantidade a ser sacada
  address: string,    // Endereço da sua carteira externa (Cold Wallet)
  network: string     // Rede de transferência (Ex: 'XRP' para Ripple, 'TRX' para Tron)
) {
  try {
    // 1. VERIFICAÇÃO DE BLINDAGEM: O senhor realmente tem esse saldo?
    const conta = await client.accountInfo();
    const saldoAtivo = conta.balances.find(b => b.asset === asset);

    if (!saldoAtivo || parseFloat(saldoAtivo.free) < amount) {
      return { 
        success: false, 
        error: `Abortado: Saldo livre insuficiente. Disponível: ${saldoAtivo?.free || 0} ${asset}` 
      };
    }

    // 2. DISPARO DA ROTA DE ESCOAMENTO
    // Este é o gatilho real que tira o dinheiro da corretora.
    const res = await client.withdraw({
      coin: asset,
      network: network,
      address: address,
      amount: String(amount),
    });

    // 3. RASTRO DE AUDITORIA NO SUPABASE
    // Usamos a sua tabela ExtractionLog para manter o histórico de que o dinheiro saiu.
    const log = await prisma.extractionLog.create({
      data: {
        amountUSDT: amount,
        destinationAddr: address,
        status: "SAQUE_EM_PROCESSAMENTO", // A Binance leva alguns minutos para confirmar na blockchain
      }
    });

    return {
      success: true,
      msg: `Escoamento de ${amount} ${asset} iniciado com sucesso para a rede ${network}.`,
      id: log.id
    };

  } catch (error: any) {
    console.error("[LUCIUS_ERROR] Falha na Rota de Extração:", error);
    // A Binance retorna mensagens de erro específicas se o endereço for inválido ou a rede estiver fora
    return { 
      success: false, 
      error: error.message || "Falha crítica de comunicação com o nó de saque." 
    };
  }
}

/** Wrapper para o painel Krypton: extração USDT BEP20 (rede BSC na Binance). */
export async function triggerExtraction(
  amount: number,
  address: string,
  _authCode: string
): Promise<{ error?: string; txHash?: string }> {
  void _authCode;
  const result = await executarProtocoloExtracao("USDT", amount, address, "BSC");
  if (!result.success) {
    return { error: result.error ?? "Falha na extração" };
  }
  return { txHash: result.id };
}
