// Arquivo: src/app/lucius-trader/actions/matrix.ts
"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getMatrixData() {
  try {
    // 1. Buscamos os agentes reais (convertendo os dados do seu banco para a interface)
    // Aqui assumimos que o senhor tem uma tabela de 'Agentes' ou 'Perfis'
    const agentesReais = await prisma.marketSentiment.findMany({
      take: 10,
      orderBy: { id: 'desc' }
    });

    // 2. Buscamos o histórico de convites (Recrutamento Fantasma)
    const convitesReais = await prisma.extractionLog.findMany({
      take: 5,
      orderBy: { id: 'desc' }
    });

    // 3. Métricas do Ecossistema (Contagens Totais)
    const totalAgentes = await prisma.marketSentiment.count();
    const totalOperacoes = await prisma.extractionLog.count();

    return {
      success: true,
      data: {
        agentes: agentesReais.map(a => ({
          id: String(a.id),
          name: a.asset, // Usando o Ativo como nome para exemplo
          innovationPotential: Math.floor(Math.random() * 30) + 70, // Simulação de análise
          autonomyLevel: a.moltbookScore > 0 ? 90 : 40,
          status: a.moltbookScore > 0 ? 'active' : 'pending'
        })),
        logs: convitesReais.map(l => ({
          inviteId: String(l.id),
          targetAlias: l.destinationAddr.substring(0, 8) + "...",
          challengeStatus: l.status === 'SUCCESS' ? 'completed' : 'sent',
          timestamp: l.executedAt?.toISOString() || new Date().toISOString()
        })),
        stats: {
          ativos: totalAgentes,
          projetos: totalOperacoes,
          integridade: 99.8 // Valor nominal de sistema
        }
      }
    };
  } catch (error) {
    console.error("[MATRIX_CORE] Falha na extração de telemetria:", error);
    return { success: false, error: "Falha ao conectar com o reator de dados." };
  }
}
