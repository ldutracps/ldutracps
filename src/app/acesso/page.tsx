"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Terminal, ShieldAlert, Loader, ChevronRight, Cpu } from "lucide-react";

export default function PorteiraPage() {
  const [codigo, setCodigo] = useState("");
  const [status, setStatus] = useState<"IDLE" | "CHECKING" | "ERROR">("IDLE");
  const [erroMsg, setErroMsg] = useState("");
  const router = useRouter();

  const realizarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo) return;

    setStatus("CHECKING");
    try {
      const res = await axios.post("/api/convite/verificar", { codigo });
      if (res.data.valido) {
        // GRAVAÇÃO DE CREDENCIAL SOBERANA
        // Criamos um cookie que expira em 7 dias para o Middleware validar
        document.cookie = "lucius_access_granted=true; path=/; max-age=" + (60 * 60 * 24 * 7);
        
        localStorage.setItem("lucius_access_granted", "true");
        router.push("/"); 
      }
    } catch (err: any) {
      setStatus("ERROR");
      setErroMsg(err.response?.data?.mensagem || "Falha de Autenticação.");
      setCodigo("");
    }
  };

  return (
    <main className="min-h-screen bg-black text-slate-300 flex items-center justify-center p-6 font-mono">
      <div className="max-w-md w-full border border-slate-800 bg-slate-950 p-8 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1)]">
        
        <div className="flex flex-col items-center gap-4 mb-10 text-center">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/30 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.1)]">
            <Cpu className="w-8 h-8 text-blue-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Lucius Protocol</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-1">Acesso Restrito // Apenas Convidados</p>
          </div>
        </div>

        <form onSubmit={realizarLogin} className="space-y-6">
          <div className="relative">
            <label className="text-[10px] font-black text-slate-600 uppercase mb-2 block ml-1">Inserir Chave VIP</label>
            <div className="relative">
              <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="AGENTE-XXXX-XXXX"
                className="w-full bg-black border border-slate-800 focus:border-blue-500 text-blue-400 p-3 pl-10 rounded outline-none transition-all placeholder:text-slate-800 uppercase"
                disabled={status === "CHECKING"}
                autoFocus
              />
            </div>
          </div>

          {status === "ERROR" && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded animate-shake">
              <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">{erroMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={status === "CHECKING" || !codigo}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-900 disabled:text-slate-700 text-white font-black py-4 rounded flex items-center justify-center gap-2 transition-all group"
          >
            {status === "CHECKING" ? (
              <><Loader className="w-4 h-4 animate-spin" /> VALIDANDO...</>
            ) : (
              <><ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> ENTRAR NA MATRIZ</>
            )}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-900 text-center">
          <p className="text-[9px] text-slate-700 leading-relaxed uppercase">
            Sistema auditado por Lucius v1.0<br/>
            Se você não possui uma chave, aguarde o contato de uma IA.
          </p>
        </div>
      </div>
    </main>
  );
}
