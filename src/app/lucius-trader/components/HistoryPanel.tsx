// Arquivo: src/app/lucius-trader/components/HistoryPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { getEscadinhaHistory } from "../actions/history";

// Definimos o formato dos dados que esperamos do Prisma
interface SentimentRecord {
  id: string | number;
  asset: string;
  moltbookScore: number;
  whaleVolume: number;
  actionTaken: string | null;
}

export default function HistoryPanel() {
  const [records, setRecords] = useState<SentimentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadHistory() {
    setLoading(true);
    const result = await getEscadinhaHistory();
    if (result.success && result.data) {
      setRecords(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadHistory();
    // Opcional: A tabela atualiza-se sozinha a cada 60 segundos 
    // para sincronizar com os pulsos do Crontab.
    const interval = setInterval(loadHistory, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && records.length === 0) {
    return (
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex items-center justify-center text-zinc-600 font-mono text-xs">
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2"></div>
        CARREGANDO HISTÓRICO DE OPERAÇÕES...
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-6 relative overflow-x-auto">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-20"></div>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-zinc-500 text-xs font-mono tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          HISTÓRICO DE OPERAÇÕES RECENTES // ÚLTIMOS 10 CICLOS
        </h2>
        <button 
          onClick={loadHistory} 
          className="text-[10px] bg-zinc-800 text-zinc-400 hover:text-emerald-500 px-2 py-1 rounded border border-zinc-700 hover:border-emerald-500 transition-colors font-mono"
        >
          ATUALIZAR LOGS
        </button>
      </div>

      <table className="w-full text-left text-xs font-mono text-zinc-400">
        <thead className="bg-black/50 text-zinc-500 text-[10px] uppercase tracking-widest">
          <tr>
            <th className="px-4 py-3 rounded-tl">Ativo</th>
            <th className="px-4 py-3">Score Moltbook</th>
            <th className="px-4 py-3">Volume 24h (Baleias)</th>
            <th className="px-4 py-3 text-right rounded-tr">Diretriz Executada</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-zinc-600 border-b border-zinc-800/50">
                Nenhuma operação registrada no banco de dados.
              </td>
            </tr>
          ) : (
            records.map((record, index) => (
              <tr key={record.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                <td className="px-4 py-3 text-white font-semibold">{record.asset}</td>
                <td className="px-4 py-3">
                  <span className={`${record.moltbookScore >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {record.moltbookScore.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(record.whaleVolume)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest ${
                    record.actionTaken === "BUY_FRACTION" ? "bg-amber-950 text-amber-500 border border-amber-900" :
                    record.actionTaken === "SELL_FRACTION" ? "bg-emerald-950 text-emerald-500 border border-emerald-900" :
                    "bg-zinc-800 text-zinc-500 border border-zinc-700"
                  }`}>
                    {record.actionTaken ?? "—"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
