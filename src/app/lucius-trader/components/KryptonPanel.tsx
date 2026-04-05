// Arquivo: src/app/lucius-trader/components/KryptonPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { getKryptonStatus } from "../actions/krypton";
import { triggerExtraction } from "../actions/extraction";

interface KryptonData {
  monthlyProfit: number;
  taxLimit: number;
  availableMargin: number;
  percentageUsed: number;
  isShieldActive: boolean;
}

export default function KryptonPanel() {
  const [data, setData] = useState<KryptonData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados do Gatilho de Extração
  const [isExtractionOpen, setIsExtractionOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [authCode, setAuthCode] = useState(""); // Alterado de 'pin' para 'authCode'
  const [extractionStatus, setExtractionStatus] = useState<"IDLE" | "PROCESSING" | "SUCCESS" | "ERROR">("IDLE");
  const [extractionMessage, setExtractionMessage] = useState("");

  useEffect(() => {
    async function loadKrypton() {
      const result = await getKryptonStatus();
      if (result.success && result.data) {
        setData(result.data);
      }
      setLoading(false);
    }
    loadKrypton();
  }, []);

  const handleExtraction = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtractionStatus("PROCESSING");
    
    const result = await triggerExtraction(parseFloat(amount), wallet, authCode);
    
    if (result.error) {
      setExtractionStatus("ERROR");
      setExtractionMessage(result.error);
    } else {
      setExtractionStatus("SUCCESS");
      setExtractionMessage(`SUCESSO. TX Hash: ${result.txHash}`);
      // Limpa os campos após sucesso
      setAmount(""); setAuthCode("");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 border-2 border-dashed border-zinc-800 rounded flex items-center justify-center text-zinc-600 font-mono text-xs">
        CARREGANDO PROTOCOLOS DE SEGURANÇA...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Indicador Numérico */}
      <div className="bg-black/50 rounded border border-zinc-800 p-4 mb-4">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">LUCRO MENSAL ISENTO</p>
            <p className="text-xl font-mono font-bold text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.monthlyProfit)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">MARGEM LIVRE</p>
            <p className={`text-sm font-mono ${data.isShieldActive ? 'text-red-500' : 'text-emerald-500'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.availableMargin)}
            </p>
          </div>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-zinc-800 relative">
          <div 
            className={`h-2.5 rounded-full transition-all duration-1000 ${data.isShieldActive ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(data.percentageUsed, 100)}%` }}
          ></div>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono mt-2 text-right">
          {data.percentageUsed.toFixed(1)}% do limite de R$ 5.000,00 atingido.
        </p>
      </div>

      {/* Status da Trava */}
      <div className={`p-3 rounded border text-xs font-mono text-center mb-6 transition-colors ${
        data.isShieldActive 
          ? 'bg-red-950/30 border-red-900 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
          : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-500'
      }`}>
        {data.isShieldActive ? "⚠️ ALERTA: BLINDAGEM FISCAL ATIVA. COMPRAS SUSPENSAS." : "🛡️ BLINDAGEM FISCAL: OPERANTE E VERDE."}
      </div>

      {/* Interface do Gatilho de Extração com 2FA */}
      {!isExtractionOpen ? (
        <button 
          onClick={() => setIsExtractionOpen(true)}
          className="w-full py-4 rounded bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-500 font-mono text-sm border border-emerald-900/50 transition-all font-bold tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          INICIAR GATILHO DE EXTRAÇÃO
        </button>
      ) : (
        <form onSubmit={handleExtraction} className="bg-zinc-950 border border-zinc-800 rounded p-4 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600"></div>
          
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs text-emerald-500 font-mono font-bold flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
              AUTENTICAÇÃO 2FA
            </h3>
            <button type="button" onClick={() => setIsExtractionOpen(false)} className="text-zinc-500 hover:text-white text-xs font-mono">CANCELAR</button>
          </div>

          <input 
            type="number" 
            placeholder="Quantidade em USDT" 
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
          />
          <input 
            type="text" 
            placeholder="Endereço Trust Wallet (BEP20)" 
            required
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
          />
          <input 
            type="text" 
            maxLength={6}
            placeholder="Código Authenticator (6 dígitos)" 
            required
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-red-400 font-mono text-center tracking-[0.5em] text-lg focus:outline-none focus:border-red-500"
          />

          {extractionStatus === "ERROR" && <div className="text-red-500 text-[10px] font-mono break-words bg-red-950/30 p-2 rounded">{extractionMessage}</div>}
          {extractionStatus === "SUCCESS" && <div className="text-emerald-500 text-[10px] font-mono break-words bg-emerald-950/30 p-2 rounded">{extractionMessage}</div>}

          <button 
            type="submit" 
            disabled={extractionStatus === "PROCESSING"}
            className="w-full py-3 mt-2 rounded bg-red-900/30 hover:bg-red-800/50 text-red-500 font-mono text-xs border border-red-900/50 transition-all font-bold tracking-widest disabled:opacity-50"
          >
            {extractionStatus === "PROCESSING" ? "PROCESSANDO..." : "CONFIRMAR EXTRAÇÃO"}
          </button>
        </form>
      )}
    </div>
  );
}
