// Arquivo: src/app/lucius-trader/components/ControlBar.tsx
"use client";

import { useEffect, useState } from "react";
import { getBinanceBalance } from "../actions/binance";

export default function ControlBar() {
  const [balances, setBalances] = useState({ xrp: 0, usdt: 0 });
  const [status, setStatus] = useState<"LOADING" | "ONLINE" | "ERROR">("LOADING");
  const [errorMessage, setErrorMessage] = useState("");

  async function syncBinance() {
    setStatus("LOADING");
    const result = await getBinanceBalance();

    if (result.error) {
      setStatus("ERROR");
      setErrorMessage(result.error);
    } else if (result.data) {
      setBalances(result.data);
      setStatus("ONLINE");
    }
  }

  // Aciona a sincronização assim que a barrinha é montada na tela
  useEffect(() => {
    syncBinance();
  }, []);

  return (
    <header className="w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-md shadow-black/50 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      
      {/* Bloco 1: Identificação e Status */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-2">
          {status === "ONLINE" ? (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
          ) : status === "ERROR" ? (
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"></div>
          )}
          <h1 className="text-emerald-500 font-mono font-bold tracking-widest text-lg">
            LUCIUS_TRADER
          </h1>
        </div>
        <span className="text-xs font-mono text-zinc-500 hidden md:inline">
          | NEXUS_UI v1.0
        </span>
      </div>

      {/* Bloco 2: Motor de Dados (Saldos da Binance) */}
      <div className="flex bg-black/50 border border-zinc-800 rounded px-4 py-2 gap-6 w-full md:w-auto justify-around">
        <div className="flex flex-col items-center md:items-start">
          <span className="text-[10px] text-zinc-500 font-mono tracking-widest">SALDO USDT</span>
          <span className="text-sm font-mono text-white font-semibold">
            {status === "ONLINE" ? `$ ${balances.usdt.toFixed(2)}` : "---"}
          </span>
        </div>
        <div className="w-px bg-zinc-800"></div>
        <div className="flex flex-col items-center md:items-start">
          <span className="text-[10px] text-zinc-500 font-mono tracking-widest">BOLSA XRP</span>
          <span className="text-sm font-mono text-white font-semibold">
            {status === "ONLINE" ? `${balances.xrp.toFixed(2)} XRP` : "---"}
          </span>
        </div>
      </div>

      {/* Bloco 3: Controles Manuais */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button 
          onClick={syncBinance}
          className="p-2 text-zinc-400 hover:text-emerald-400 border border-zinc-700 hover:border-emerald-500 rounded transition-all bg-zinc-800"
          title="Forçar Sincronização"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button 
          disabled
          className="flex-1 md:flex-none px-4 py-2 bg-emerald-900/30 text-emerald-600/50 border border-emerald-900/50 rounded text-xs font-mono tracking-widest cursor-not-allowed"
          title="Será ativado após 2FA"
        >
          EXTRAIR LUCRO
        </button>
      </div>

      {/* Alerta de Erro Crítico (Se houver) */}
      {status === "ERROR" && (
        <div className="absolute top-20 right-4 bg-red-950 border border-red-900 text-red-400 text-xs font-mono p-3 rounded shadow-lg z-50">
          ⚠️ {errorMessage}
        </div>
      )}
    </header>
  );
}
