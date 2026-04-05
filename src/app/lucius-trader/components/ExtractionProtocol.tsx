"use client";

import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { executarProtocoloExtracao } from '../actions/extraction';

export default function ExtractionProtocol() {
  const [asset, setAsset] = useState('USDT'); // Agora o padrão é USDT
  const [network, setNetwork] = useState('BSC'); // Rede mais barata para USDT
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mensagem, setMensagem] = useState('');

  const handleExtracao = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !address) {
      setStatus('error');
      setMensagem("Preencha montante e destino.");
      return;
    }

    setStatus('loading');
    setMensagem("A encriptar...");

    const resultado = await executarProtocoloExtracao(
      asset, 
      parseFloat(amount), 
      address, 
      network
    );

    if (resultado.success) {
      setStatus('success');
      setMensagem(resultado.msg || "Ejeção concluída.");
      setAmount(''); 
    } else {
      setStatus('error');
      setMensagem(resultado.error || "Erro na rota.");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full justify-between">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
          <ShieldAlert className="w-3 h-3" /> Ticket-11 (Ejeção)
        </h2>
      </div>

      <form onSubmit={handleExtracao} className="space-y-3">
        
        <div className="grid grid-cols-3 gap-2">
          <select 
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="bg-black/40 border border-slate-700 rounded-lg p-2 text-[10px] text-white font-bold outline-none focus:border-red-500"
          >
            <option value="USDT">USDT</option>
            <option value="XRP">XRP</option>
          </select>

          <select 
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="bg-black/40 border border-slate-700 rounded-lg p-2 text-[10px] text-white font-bold outline-none focus:border-red-500"
          >
            <option value="BSC">BSC (BEP20)</option>
            <option value="TRX">TRON (TRC20)</option>
            <option value="XRP">Rede XRP</option>
          </select>

          <input 
            type="number" 
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Valor"
            className="bg-black/40 border border-slate-700 rounded-lg p-2 text-[10px] text-white font-mono font-bold outline-none focus:border-red-500"
          />
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Endereço da Cold Wallet..."
            className="flex-1 bg-black/40 border border-slate-700 rounded-lg p-2 text-[10px] text-emerald-400 font-mono outline-none focus:border-emerald-500 placeholder:text-slate-700"
          />
          <button 
            type="submit"
            disabled={status === 'loading'}
            className="bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/30 rounded-lg px-3 flex items-center justify-center transition-all disabled:opacity-50"
            title="Ejetar"
          >
            {status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
          </button>
        </div>

        {status !== 'idle' && (
          <div className={`p-2 rounded-lg border text-[9px] font-mono truncate ${
            status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            status === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
            'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
            {mensagem}
          </div>
        )}
      </form>
    </div>
  );
}
