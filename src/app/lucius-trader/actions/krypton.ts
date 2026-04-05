// Arquivo: src/app/lucius-trader/actions/krypton.ts
"use server";

// Importamos a sua conexão existente do Prisma. 
// (Nota tática: Ajuste o caminho "@/lib/prisma" se o seu arquivo prisma.ts estiver em outro local)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getKryptonStatus() {
  try {
    const today = new Date();
    // Pega o primeiro dia do mês atual à meia-noite
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // O Prisma faz uma agregação para somar todo o lucro das operações "COMPLETED" do mês
    const logs = await prisma.xRPRecoveryLog.aggregate({
      _sum: {
        profitRealized: true,
      },
      where: {
        status: "COMPLETED",
        executedAt: {
          gte: firstDayOfMonth,
        },
      },
    });

    const monthlyProfit = logs._sum.profitRealized || 0;
    const taxLimit = 5000.00; // A trava inviolável do Governo Brasileiro
    const availableMargin = taxLimit - monthlyProfit;
    const percentageUsed = (monthlyProfit / taxLimit) * 100;

    // Se batermos 95% do limite (R$ 4.750), a blindagem entra em vigor e trava a escadinha
    const isShieldActive = percentageUsed >= 95;

    console.log(`[KRYPTON_SEC] Lucro Mensal: R$ ${monthlyProfit} | Margem Restante: R$ ${availableMargin}`);

    return {
      success: true,
      data: {
        monthlyProfit,
        taxLimit,
        availableMargin,
        percentageUsed,
        isShieldActive,
      },
    };
  } catch (error) {
    console.error("[KRYPTON_SEC] Falha crítica na leitura do Prisma:", error);
    return { error: "Erro ao ler matriz de dados fiscais." };
  }
}
