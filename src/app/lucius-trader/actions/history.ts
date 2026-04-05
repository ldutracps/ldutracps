// Arquivo: src/app/lucius-trader/actions/history.ts
"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getEscadinhaHistory() {
  try {
    // Ordenamos pela ID de forma decrescente para pegar os registros mais recentes primeiro.
    // Limitamos a 10 (take: 10) para não poluir a interface e focar apenas no cenário atual.
    const history = await prisma.marketSentiment.findMany({
      where: {
        asset: 'XRP',
      },
      orderBy: {
        id: 'desc',
      },
      take: 10,
    });

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    console.error("[DATA_GOLIATH] Falha ao recuperar histórico de operações:", error);
    return { error: "Ocorreu uma falha ao tentar ler a matriz de histórico." };
  }
}
