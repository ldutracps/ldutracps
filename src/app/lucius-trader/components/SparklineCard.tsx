"use client";

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';

// Interface que define as peças de informação que o card precisa receber
interface SparklineCardProps {
  coin: string;
  amount: string;
  valorEmBRL: string;
  historicoPrecos: number[];
}

export default function SparklineCard({ coin, amount, valorEmBRL, historicoPrecos }: SparklineCardProps) {
  // Lógica para descobrir se o último preço é maior que o penúltimo
  const subiu = historicoPrecos[historicoPrecos.length - 1] >= historicoPrecos[historicoPrecos.length - 2];
  const corTendencia = subiu ? "#10b981" : "#ef4444"; // Verde (Subiu) ou Vermelho (Caiu)

  return (
    <div className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.05] transition-all group">
      
      {/* Bloco 1: Ícone e Nome da Moeda */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-blue-400 border border-slate-700 group-hover:border-blue-500/50 transition-colors">
          {coin.substring(0, 3)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-white">{coin}</p>
            {subiu ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">{amount}</p>
        </div>
      </div>

      {/* Bloco 2: O Gráfico Sparkline */}
      <div className="w-24 h-10 flex items-center px-2">
        <Sparklines data={historicoPrecos} limit={10} width={100} height={40}>
          <SparklinesLine style={{ stroke: corTendencia, strokeWidth: 3, fill: "none" }} />
          <SparklinesSpots size={2} style={{ fill: corTendencia }} />
        </Sparklines>
      </div>

      {/* Bloco 3: Valor da Moeda em Reais */}
      <div className="text-right">
        <p className="text-xs font-mono font-bold text-slate-300">R$ {valorEmBRL}</p>
        <p className="text-[8px] text-slate-600 uppercase font-bold tracking-widest mt-1">Saldo BR</p>
      </div>
      
    </div>
  );
}
