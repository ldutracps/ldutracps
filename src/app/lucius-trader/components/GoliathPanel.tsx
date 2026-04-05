// Arquivo: src/app/lucius-trader/components/GoliathPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { getGoliathAnalysis } from "../actions/goliath";

interface GoliathData {
  price: number;
  volume: number;
  change: number;
  moltbookScore: number;
  actionTaken: string;
}

export default function GoliathPanel() {
  const [data, setData] = useState<GoliathData | null>(null);
  const [loading, setLoading] = useState(true);

  async function runAnalysis() {
    setLoading(true);
    const result = await getGoliathAnalysis();
    if (result.success && result.data) {
      setData(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    runAnalysis();
    // Opcional: Atualiza a cada 30 segundos
    const interval = setInterval(runAnalysis, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-zinc-600 font-mono text-xs border-2 border-dashed border-zinc-800 rounded min-h-[200px]">
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        CALCULANDO VETORES DE VOLUME E SENTIMENTO...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Topo: Preço e Mudança */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/50 border border-zinc-800 rounded p-4">
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">XRP/USDT</p>
          <p className="text-xl font-mono text-white">$ {data.price.toFixed(4)}</p>
        </div>
        <div className="bg-black/50 border border-zinc-800 rounded p-4">
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">VARIAÇÃO 24H</p>
          <p className={`text-xl font-mono ${data.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {data.change > 0 ? '+' : ''}{data.change.toFixed(2)}%
          </p>
        </div>
        <div className="bg-black/50 border border-zinc-800 rounded p-4 col-span-2">
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">MOLTBOOK SCORE (-1 a 1)</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex-1 h-2 bg-zinc-900 rounded-full relative">
               <div 
                 className={`absolute top-0 h-full rounded-full transition-all duration-1000 ${data.moltbookScore >= 0 ? 'bg-emerald-500 left-1/2' : 'bg-red-500 right-1/2'}`}
                 style={{ width: `${Math.abs(data.moltbookScore * 50)}%` }}
               ></div>
               <div className="absolute top-[-4px] left-1/2 w-1 h-4 bg-zinc-700 -ml-[2px]"></div>
            </div>
            <span className="text-xs font-mono text-zinc-400">{data.moltbookScore.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Tabela de Ação / Escadinha */}
      <div className="flex-1 bg-black/50 border border-zinc-800 rounded p-4 flex flex-col justify-center items-center">
        <p className="text-[10px] text-zinc-500 font-mono tracking-widest mb-2">DIRETRIZ DE EXECUÇÃO (@DATA_GOLIATH)</p>
        <div className={`px-6 py-2 rounded text-lg font-mono font-bold tracking-widest ${
          data.actionTaken === "BUY_FRACTION" ? "bg-amber-950/50 text-amber-500 border border-amber-900" :
          data.actionTaken === "SELL_FRACTION" ? "bg-emerald-950/50 text-emerald-500 border border-emerald-900" :
          "bg-zinc-900 text-zinc-500 border border-zinc-800"
        }`}>
          {data.actionTaken === "HOLD" ? "AGUARDANDO OPORTUNIDADE (HOLD)" : 
           data.actionTaken === "BUY_FRACTION" ? "COMPRAR DEGRAU INFERIOR" : 
           "VENDER DEGRAU SUPERIOR (LUCRO)"}
        </div>
      </div>
    </div>
  );
}
