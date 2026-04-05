"use server";

import Binance from 'binance-api-node';

// Inicializamos o cliente da Binance. Para ler dados de mercado (públicos),
// as chaves de API não são estritamente necessárias, mas mantê-las garante maior limite de requisições.
const client = Binance({
  apiKey: process.env.BINANCE_API_KEY!,
  apiSecret: process.env.BINANCE_API_SECRET!,
});

// A nossa matriz tática sincronizada com o robô de Scalping
const ALVOS_NA_MIRA = ['SOL', 'ADA', 'DOGE', 'BNB', 'TRX', 'AVAX', 'DOT', 'LINK', 'LTC', 'NEAR'];

// O filtro de profundidade: Qualquer ordem abaixo de $ 50.000 USDT é considerada "sardinha" e ignorada.
const LIMITE_BALEIA_USDT = 50000; 

export async function rastrearBaleiasGlobais() {
  try {
    const agora = new Date().toLocaleTimeString('pt-BR');

    // Mapeamento Assíncrono: Disparamos as 10 sondas ao mesmo tempo para máxima velocidade
    const promessasDeRastreio = ALVOS_NA_MIRA.map(async (moeda) => {
      const par = `${moeda}USDT`;
      
      // Buscamos os últimos 500 trades reais executados na corretora para este par
      const tradesRecentes = await client.trades({ symbol: par, limit: 500 });
      
      let volumeTotalDeBaleias = 0;
      let maiorBoletadaUnica = 0;
      let tipoMaiorBoletada = 'NEUTRO';

      // Vasculhamos trade por trade
      tradesRecentes.forEach(trade => {
        const precoExecutado = parseFloat(trade.price);
        const quantidadeExecutada = parseFloat(trade.quantity);
        const valorTotalUSDT = precoExecutado * quantidadeExecutada;

        // Se o valor financeiro da ordem passou do nosso limite, o alarme toca
        if (valorTotalUSDT >= LIMITE_BALEIA_USDT) {
          volumeTotalDeBaleias += valorTotalUSDT;
          
          // Registamos qual foi a ordem mais brutal dentro deste bloco de 500 trades
          if (valorTotalUSDT > maiorBoletadaUnica) {
            maiorBoletadaUnica = valorTotalUSDT;
            
            // isBuyerMaker = true significa que o vendedor atirou as moedas a preço de mercado (Despejo/Queda).
            // isBuyerMaker = false significa que o comprador devorou as ordens de venda (Acumulação/Alta).
            tipoMaiorBoletada = trade.isBuyerMaker ? 'BALEIA VENDENDO' : 'BALEIA COMPRANDO';
          }
        }
      });

      return {
        moeda: moeda,
        volumeBaleias: volumeTotalDeBaleias,
        maiorBoletada: maiorBoletadaUnica,
        tendencia: tipoMaiorBoletada,
        timestamp: agora
      };
    });

    // Aguardamos que as 10 sondas retornem os seus relatórios
    const resultadosBrutos = await Promise.all(promessasDeRastreio);
    
    // Filtramos apenas os mares onde houve atividade de baleia e ordenamos pela maior movimentação
    const maresAgitados = resultadosBrutos
      .filter(resultado => resultado.volumeBaleias > 0)
      .sort((a, b) => b.volumeBaleias - a.volumeBaleias); 

    return { 
      success: true, 
      dados: maresAgitados,
      msg: maresAgitados.length > 0 
        ? `Sonares detectaram anomalias em ${maresAgitados.length} ativos.` 
        : "Mar calmo. Nenhuma baleia detectada na última leitura."
    };

  } catch (error) {
    console.error("[LUCIUS_ERROR] Falha Crítica no Sonar de Profundidade:", error);
    return { success: false, error: "As sondas perderam comunicação com a Binance." };
  }
}
