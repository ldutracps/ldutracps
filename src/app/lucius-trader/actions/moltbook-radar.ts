"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. O DICIONÁRIO DE INTELIGÊNCIA ARTIFICIAL (PESOS DE SENTIMENTO)
// Palavras e emojis que indicam Euforia (Alta)
const INDICADORES_EUFORIA = [
  { termo: '🚀', peso: 15 },
  { termo: 'lua', peso: 10 },
  { termo: 'comprar', peso: 8 },
  { termo: '📈', peso: 10 },
  { termo: 'pump', peso: 12 },
  { termo: 'hold', peso: 5 },
  { termo: 'gem', peso: 8 }
];

// Palavras e emojis que indicam Pânico (Baixa)
const INDICADORES_PANICO = [
  { termo: 'vender', peso: -10 },
  { termo: 'derreter', peso: -12 },
  { termo: 'scam', peso: -20 },
  { termo: '📉', peso: -10 },
  { termo: 'dump', peso: -15 },
  { termo: 'fumo', peso: -10 },
  { termo: 'lixo', peso: -8 }
];

/**
 * @function calcularSentimentoMoltbook
 * @description Lê os posts recentes do Moltbook sobre uma moeda e gera um Score Tático.
 * @param ativo A sigla da moeda (Ex: 'SOL', 'ADA', 'XRP')
 */
export async function calcularSentimentoMoltbook(ativo: string) {
  try {
    // Passo 1: Buscar os posts na sua base de dados do Moltbook
    // NOTA TÁTICA: Assumimos aqui uma tabela genérica 'MoltbookPost'. 
    // Se o senhor usar outro nome de tabela, basta ajustar aqui.
    /*
    const postsRecentes = await prisma.moltbookPost.findMany({
      where: {
        content: { contains: ativo, mode: 'insensitive' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Últimas 24 horas
      },
      select: { content: true }
    });
    */

    // Como o Moltbook pode ainda não estar totalmente interligado ao banco do Lucius Trader,
    // vamos criar um simulador de extração de textos da rede para fins educativos e de teste tático.
    const postsExtraidosDaRede = [
      `Acho que a ${ativo} vai bater na lua hoje! 🚀🚀🚀`,
      `Alguém a comprar ${ativo}? O gráfico está lindo 📈`,
      `Não sei não, o projeto da ${ativo} parece meio scam...`,
      `${ativo} vai dar pump! hold garantido. 🚀 gem`
    ];

    let pontuacaoHype = 50; // Começamos sempre neutros (50 pontos)
    let volumeDePosts = postsExtraidosDaRede.length;
    let emojisFogueteEncontrados = 0;

    // Passo 2: O Motor de Varredura de Texto
    postsExtraidosDaRede.forEach(post => {
      const textoNormalizado = post.toLowerCase();

      // Rastreio de Euforia
      INDICADORES_EUFORIA.forEach(indicador => {
        if (textoNormalizado.includes(indicador.termo)) {
          pontuacaoHype += indicador.peso;
          if (indicador.termo === '🚀') emojisFogueteEncontrados++;
        }
      });

      // Rastreio de Pânico
      INDICADORES_PANICO.forEach(indicador => {
        if (textoNormalizado.includes(indicador.termo)) {
          pontuacaoHype += indicador.peso;
        }
      });
    });

    // Passo 3: Trava Limite (O Score nunca pode ser menor que 0 ou maior que 100)
    if (pontuacaoHype > 100) pontuacaoHype = 100;
    if (pontuacaoHype < 0) pontuacaoHype = 0;

    return {
      success: true,
      ativo: ativo,
      score: pontuacaoHype,
      volumeAmostra: volumeDePosts,
      foguetesDetectados: emojisFogueteEncontrados,
      status: pontuacaoHype >= 80 ? "EUFORIA EXTREMA" : pontuacaoHype <= 30 ? "PÂNICO" : "NEUTRO"
    };

  } catch (error) {
    console.error(`[LUCIUS_ERROR] Falha ao extrair dados do Moltbook para ${ativo}:`, error);
    return { success: false, score: 50 }; // Em caso de falha, retorna neutro para não quebrar o robô
  }
}
