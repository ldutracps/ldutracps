"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Cpu, History, Wallet, CircleDollarSign, TerminalSquare, Crosshair
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// IMPORTAÇÃO DAS AÇÕES TÁTICAS
import { obterDadosReais } from "./actions/get-data";
import { processarSinalGoliath } from "./actions/goliath-logic";
import ExtractionProtocol from "./components/ExtractionProtocol";
import SparklineCard from "./components/SparklineCard";

export default function LuciusTraderMultiAsset() {
  const [tickerXRP, setTickerXRP] = useState("0.00");
  const [patrimonio, setPatrimonio] = useState("0.00");
  const [saldoUSDT, setSaldoUSDT] = useState("0.00"); 
  const [ativos, setAtivos] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  
  const [telemetria, setTelemetria] = useState<{msg: string, variant: string}[]>([]);
  const [statusRobo, setStatusRobo] = useState("Sincronizando...");
  const [hasMounted, setHasMounted] = useState(false);

  const isScanning = useRef(false);

  // SINCRONIZAÇÃO TÁTICA: Agora com os 10 alvos que o robô está operando
  const ALVOS_NA_MIRA = ['SOL', 'ADA', 'DOGE', 'BNB', 'TRX', 'AVAX', 'DOT', 'LINK', 'LTC', 'NEAR'];

  const formatarR$ = (valor: string | number) => {
    const numerico = typeof valor === 'string' ? parseFloat(valor) : valor;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numerico || 0);
  };

  const cicloDeCombate = async () => {
    if (isScanning.current) return;
    isScanning.current = true;

    setStatusRobo("Varrimento...");
    
    // 1. LEITURA SENSORIAL (uma única chamada pesada por ciclo)
    const dados = await obterDadosReais();
    if (dados.success) {
      setTickerXRP(dados.precoXRP || "0");
      setPatrimonio(dados.patrimonioTotal || "0");
      setAtivos(dados.ativos || []);
      setHistorico(dados.ordens || []);

      const ativoUSDT = dados.ativos?.find((a: any) => a.coin === 'USDT');
      setSaldoUSDT(ativoUSDT ? ativoUSDT.amount : "0.00");
    }

    // 2. GOLIATH: reutiliza o mesmo radar quando ok (evita dobrar pedidos à Binance / 429)
    const decisao =
      dados.success ? await processarSinalGoliath(dados) : await processarSinalGoliath();
    
    setTelemetria(prev => [{ msg: decisao.msg, variant: decisao.variant }, ...prev].slice(0, 3));

    // Se o robô executou uma ordem, atualizamos o painel imediatamente
    if (decisao.acao) {
      const dadosAtualizados = await obterDadosReais();
      if (dadosAtualizados.success) {
         setAtivos(dadosAtualizados.ativos || []);
         setHistorico(dadosAtualizados.ordens || []);
         setPatrimonio(dadosAtualizados.patrimonioTotal || "0");
         
         const ativoUSDTNovo = dadosAtualizados.ativos?.find((a: any) => a.coin === 'USDT');
         setSaldoUSDT(ativoUSDTNovo ? ativoUSDTNovo.amount : "0.00");
      }
    }

    setStatusRobo("Ativo (5s)");
    isScanning.current = false;
  };

  useEffect(() => {
    setHasMounted(true);
    cicloDeCombate(); 
    
    // PULSO DE ALTA FREQUÊNCIA: 5 SEGUNDOS
    const interval = setInterval(cicloDeCombate, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!hasMounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-blue-500/30">
      
      {/* HEADER: TELEMETRIA E MUNIÇÃO */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-xl border border-blue-400/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Lucius Trader</h1>
            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Scalper Ativo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-slate-900/50 p-3 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div className="text-right border-r border-slate-800 pr-5">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-0.5">Munição (USDT)</p>
            <p className="text-lg font-mono font-bold text-emerald-400">$ {parseFloat(saldoUSDT).toFixed(2)}</p>
          </div>
          <div className="text-right border-r border-slate-800 pr-5">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-0.5">XRP / BRL</p>
            <p className="text-lg font-mono font-bold text-blue-400">{formatarR$(tickerXRP)}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-0.5">Goliath Auto</p>
            <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">{statusRobo}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        
        {/* MINI CARDS: RADAR E EXTRAÇÃO */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full min-h-[120px]">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-3 flex items-center gap-2">
              <TerminalSquare className="w-3 h-3" /> Radar HFT (Moltbook Connect)
            </h2>
            <div className="flex-1 overflow-hidden flex flex-col-reverse text-[9px] font-mono">
              <AnimatePresence initial={false}>
                {telemetria.length === 0 ? (
                  <p className="text-zinc-700 animate-pulse italic">Iniciando varredura social e de mercado...</p>
                ) : (
                  telemetria.map((log, i) => (
                    <motion.p 
                      key={i} 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className={`mb-1 truncate ${
                        log.variant === 'success' ? 'text-emerald-400 font-bold' : 
                        log.variant === 'error' ? 'text-red-400 font-bold' : 
                        'text-blue-400/80'
                      }`}
                    >
                      <span className="text-slate-600 mr-2">&gt;</span>{log.msg}
                    </motion.p>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          <ExtractionProtocol />

        </section>

        {/* ÁREA PRINCIPAL */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CARTEIRA E ALVOS */}
          <div className="lg:col-span-8 bg-gradient-to-br from-slate-900 to-black border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl border-t-slate-700/30">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 border-b border-slate-800/50 pb-6">
              
              <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Wallet className="w-3 h-3 text-blue-500" /> Património Estimado (BRL)
                </h3>
                <p className="text-4xl font-black text-white tracking-tight">{formatarR$(patrimonio)}</p>
              </div>

              {/* LISTA EXPANDIDA DE 10 ALVOS */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-center">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Crosshair className="w-3 h-3 text-red-500" /> Alvos na Mira (10 Ativos)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {ALVOS_NA_MIRA.map(coin => (
                    <div key={coin} className="flex items-center gap-1.5 px-2 py-1 bg-black border border-slate-800 rounded-md shadow-sm">
                      <div className="w-1.2 h-1.2 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-[8px] font-black text-slate-300 tracking-wider">{coin}/USDT</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">Ativos Detetados na Binance</p>
              
              {ativos.length === 0 ? (
                <p className="text-[10px] font-mono text-slate-600 italic">Escaneando saldos...</p>
              ) : (
                ativos.map(ativo => (
                  <SparklineCard 
                    key={ativo.coin}
                    coin={ativo.coin}
                    amount={ativo.amount}
                    valorEmBRL={ativo.valorEmBRL}
                    historicoPrecos={ativo.historicoPrecos}
                  />
                ))
              )}
            </div>
          </div>

          {/* HISTÓRICO PROFISSIONAL */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-500" /> Registo de Operações
            </h3>
            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {historico.length === 0 ? (
                <p className="text-[10px] text-slate-700 font-mono italic">Aguardando o primeiro lucro...</p>
              ) : (
                historico.map(o => {
                  const isBuy = o.status.includes('BUY');
                  const tituloAcao = isBuy ? 'COMPROU' : 'VENDEU';
                  const corClasse = isBuy 
                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                  return (
                    <div key={o.id} className="p-3 bg-black/40 border border-slate-800 rounded-xl flex justify-between items-center transition-all hover:border-slate-600">
                      <div>
                        <p className="text-[10px] font-black text-white uppercase">{tituloAcao} {o.asset}</p>
                        <p className="text-[8px] font-mono text-zinc-500 mt-0.5">{o.time} • Qtd: {parseFloat(o.amount).toFixed(4)}</p>
                      </div>
                      <span className={`text-[8px] font-black px-2 py-1 rounded border ${corClasse}`}>
                        {isBuy ? 'ENTRADA' : 'LUCRO'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </section>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
}
