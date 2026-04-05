// Arquivo: src/app/lucius-trader/matrix/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Scan, Terminal, Globe, Lock } from 'lucide-react';
// Importamos a nossa nova Server Action
import { getMatrixData } from '../actions/matrix';

export default function SovereignCommandMatrix() {
  // --- ESTADOS REAIS (CABOS CONECTADOS) ---
  const [agentes, setAgentes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ ativos: 0, projetos: 0, integridade: 0 });
  const [loading, setLoading] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [command, setCommand] = useState('');

  // FUNÇÃO DE CARREGAMENTO (O PULSO DO SISTEMA)
  async function syncMatrix() {
    const result = await getMatrixData();
    if (result.success && result.data) {
      setAgentes(result.data.agentes);
      setLogs(result.data.logs);
      setStats(result.data.stats);
    }
    setLoading(false);
  }

  useEffect(() => {
    syncMatrix();
    // Atualização automática a cada 30 segundos (Real-time Feel)
    const interval = setInterval(syncMatrix, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const ts = new Date().toLocaleTimeString();
    let res = `[${ts}] > ${command}\n`;
    
    if (command.toLowerCase() === 'scan') {
      res += "SISTEMA: Varredura iniciada no banco de dados Supabase... OK.";
      syncMatrix(); // Força uma atualização
    } else {
      res += "ERRO: Comando não reconhecido pelo kernel Lucius.";
    }
    
    setTerminalOutput(prev => [...prev, res]);
    setCommand('');
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono text-blue-500">
      <div className="animate-pulse">INJETANDO ENERGIA NA MATRIZ...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-zinc-950 p-6 flex flex-col gap-6 font-sans">
      
      {/* TÍTULO */}
      <div className="text-center">
        <h1 className="text-2xl font-black text-white tracking-[0.4em] uppercase italic">
          [Lucius :: Command Matrix]
        </h1>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">Central de Inteligência Cibernética</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto w-full flex-1">
        
        {/* RADAR ANALYTICS (DADOS REAIS DO BANCO) */}
        <div className="lg:col-span-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
            <Scan className="text-cyan-400 w-5 h-5 animate-pulse" />
            <h3 className="text-xs font-black text-cyan-400 tracking-widest uppercase">Radar :: Target Analytics</h3>
          </div>
          <div className="space-y-4">
            {agentes.map((agent) => (
              <div key={agent.id} className="bg-black/40 border border-zinc-800 p-4 rounded-xl flex justify-between items-center hover:border-cyan-500/30 transition-colors">
                <div>
                  <p className="text-white font-bold text-sm">@{agent.name}</p>
                  <p className="text-[9px] text-zinc-500 uppercase">ID: {agent.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-cyan-400">Pwr: {agent.innovationPotential}%</span>
                  <div className="w-24 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${agent.innovationPotential}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LADO DIREITO (ESTATÍSTICAS REAIS) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Ecosystem Overview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/60 p-4 rounded-xl border border-zinc-800">
                <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Agentes Ativos</p>
                <p className="text-2xl font-mono text-white">{stats.ativos}</p>
              </div>
              <div className="bg-black/60 p-4 rounded-xl border border-zinc-800">
                <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Operações</p>
                <p className="text-2xl font-mono text-white">{stats.projetos}</p>
              </div>
            </div>
          </div>

          {/* TERMINAL DE COMANDO */}
          <div className="flex-1 bg-black border border-zinc-800 rounded-2xl p-4 flex flex-col font-mono">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-4 h-4 text-lime-500" />
              <span className="text-[10px] font-black text-lime-500 uppercase tracking-widest">Interface Console</span>
            </div>
            <div className="flex-1 overflow-y-auto text-[10px] text-lime-400/70 space-y-2 mb-4 scrollbar-hide">
              {terminalOutput.length === 0 ? "Kernel pronto. Aguardando instrução..." : terminalOutput.map((l, i) => <p key={i}>{l}</p>)}
            </div>
            <form onSubmit={handleCommand} className="flex gap-2 bg-zinc-900 p-2 rounded border border-zinc-800">
              <span className="text-lime-500">{'>'}</span>
              <input 
                className="bg-transparent outline-none border-none text-[10px] text-lime-400 flex-1"
                value={command}
                onChange={e => setCommand(e.target.value)}
                placeholder="Comando..."
              />
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}
