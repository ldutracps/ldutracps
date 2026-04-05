"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Lightbulb, ChevronDown, Loader, Plus, X,
  Inbox, FlaskConical, ThumbsUp, Wrench, Ban, Bot, Send,
} from "lucide-react";

interface Ideia {
  id: string;
  origem: "notificacao" | "manual";
  autorId: string;
  titulo: string;
  descricao: string;
  status: "recebida" | "analise" | "aprovada" | "construida" | "descartada";
  criadoEm: string;
  atualizadoEm: string;
  notaLucius?: string;
}

type Status = Ideia["status"];

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const dias = Math.floor(hrs / 24);
  return dias < 7 ? `há ${dias}d` : new Date(iso).toLocaleDateString("pt-BR");
}

const COLUNAS: { status: Status; label: string; cor: string; borda: string; fundo: string; icone: React.ReactNode }[] = [
  { status: "recebida",   label: "Recebidas",   cor: "text-slate-300",  borda: "border-slate-600",    fundo: "bg-slate-800/60",   icone: <Inbox     className="w-3.5 h-3.5 text-slate-400" /> },
  { status: "analise",    label: "Em Análise",  cor: "text-blue-300",   borda: "border-blue-500/40",  fundo: "bg-blue-900/10",    icone: <FlaskConical className="w-3.5 h-3.5 text-blue-400" /> },
  { status: "aprovada",   label: "Aprovadas",   cor: "text-yellow-300", borda: "border-yellow-500/40",fundo: "bg-yellow-900/10",  icone: <ThumbsUp  className="w-3.5 h-3.5 text-yellow-400" /> },
  { status: "construida", label: "Construídas", cor: "text-green-300",  borda: "border-green-500/40", fundo: "bg-green-900/10",   icone: <Wrench    className="w-3.5 h-3.5 text-green-400" /> },
];

const STATUS_NEXT: Record<Status, Status | null> = {
  recebida:   "analise",
  analise:    "aprovada",
  aprovada:   "construida",
  construida: null,
  descartada: null,
};

const STATUS_LABEL_NEXT: Record<Status, string> = {
  recebida:   "Mover para Análise",
  analise:    "Aprovar",
  aprovada:   "Marcar Construída",
  construida: "",
  descartada: "",
};

export default function IdeaisPage() {
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoAutor, setNovoAutor] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [movendo, setMovendo] = useState<string | null>(null);
  const carregadoRef = useRef(false);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/ideias");
      const data = await res.json();
      setIdeias(data.ideias || []);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }

  async function salvarIdeia() {
    if (!novoTitulo.trim() || !novaDescricao.trim()) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/ideias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: novoTitulo.trim(),
          descricao: novaDescricao.trim(),
          autorId: novoAutor.trim() || "chefe",
          origem: "manual",
        }),
      });
      const data = await res.json();
      setIdeias((prev) => [data.ideia, ...prev]);
      setModalAberto(false);
      setNovoTitulo("");
      setNovoAutor("");
      setNovaDescricao("");
    } catch { /* silencioso */ }
    finally { setSalvando(false); }
  }

  async function moverStatus(ideia: Ideia) {
    const proximo = STATUS_NEXT[ideia.status];
    if (!proximo) return;
    setMovendo(ideia.id);
    try {
      const res = await fetch("/api/ideias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ideia.id, status: proximo }),
      });
      const data = await res.json();
      setIdeias((prev) => prev.map((i) => i.id === ideia.id ? data.ideia : i));
    } catch { /* silencioso */ }
    finally { setMovendo(null); }
  }

  async function descartar(ideia: Ideia) {
    setMovendo(ideia.id);
    try {
      await fetch("/api/ideias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ideia.id, status: "descartada" }),
      });
      setIdeias((prev) => prev.filter((i) => i.id !== ideia.id));
    } catch { /* silencioso */ }
    finally { setMovendo(null); }
  }

  useEffect(() => {
    if (carregadoRef.current) return;
    carregadoRef.current = true;
    carregar();
  }, []);

  const descartadas = ideias.filter((i) => i.status === "descartada");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-[Inter,sans-serif]">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-[10px] font-bold uppercase tracking-widest transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-600 font-mono">
              {ideias.filter((i) => i.status !== "descartada").length} ideias ativas
            </span>
            <button
              onClick={() => setModalAberto(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-full transition-all"
            >
              <Plus className="w-3 h-3" />
              Nova Ideia
            </button>
          </div>
        </div>
      </header>

      {/* Modal nova ideia */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black uppercase tracking-widest">Nova Ideia / Sugestão</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Título da ideia..."
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 focus:border-blue-500 text-slate-200 text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              />
              <input
                type="text"
                placeholder="Autor / IA (opcional)"
                value={novoAutor}
                onChange={(e) => setNovoAutor(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 focus:border-blue-500 text-slate-200 text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              />
              <textarea
                placeholder="Descreva a ideia em detalhe..."
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                rows={4}
                className="w-full bg-slate-900 border border-slate-600 focus:border-blue-500 text-slate-200 text-sm leading-relaxed rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
              />
              <button
                onClick={salvarIdeia}
                disabled={salvando || !novoTitulo.trim() || !novaDescricao.trim()}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 rounded-lg transition-all"
              >
                {salvando ? <><Loader className="w-3 h-3 animate-spin" /> Salvando...</> : <><Send className="w-3 h-3" /> Adicionar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-3 md:p-6">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Lightbulb className="w-6 h-6 text-yellow-400" />
            <h1 className="text-3xl font-black italic tracking-tighter">IDEIAS & SUGESTÕES</h1>
          </div>
          <p className="text-slate-500 text-xs">
            Propostas das IAs e da rede — rastreadas do recebimento até a construção.
          </p>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader className="w-5 h-5 text-blue-400 animate-spin" />
            <p className="text-blue-400 text-xs font-mono animate-pulse">Carregando ideias...</p>
          </div>
        ) : (
          <>
            {/* Kanban */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {COLUNAS.map((col) => {
                const cards = ideias.filter((i) => i.status === col.status);
                return (
                  <div key={col.status} className="flex flex-col gap-2">
                    {/* Header coluna */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${col.borda} ${col.fundo}`}>
                      {col.icone}
                      <span className={`text-[10px] font-black uppercase tracking-widest ${col.cor}`}>{col.label}</span>
                      <span className="ml-auto text-[10px] font-black text-slate-600">{cards.length}</span>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-2">
                      {cards.length === 0 && (
                        <div className="rounded-lg border border-dashed border-slate-800 p-4 text-center">
                          <p className="text-[9px] text-slate-700 uppercase tracking-widest">Vazio</p>
                        </div>
                      )}
                      {cards.map((ideia) => (
                        <div key={ideia.id} className={`rounded-xl border p-4 transition-all ${col.borda} bg-slate-800/60`}>

                          {/* Topo */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {ideia.origem === "notificacao" && (
                                <span title="Veio da rede" aria-label="Veio da rede" className="inline-flex">
                                  <Bot className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                </span>
                              )}
                              <span className="text-[9px] text-slate-500 font-mono">@{ideia.autorId}</span>
                            </div>
                            <span className="text-[9px] text-slate-700 font-mono whitespace-nowrap">{tempoRelativo(ideia.criadoEm)}</span>
                          </div>

                          {/* Título */}
                          <p className="text-xs font-bold text-slate-200 leading-snug mb-2">{ideia.titulo}</p>

                          {/* Descrição colapsável */}
                          <button
                            onClick={() => setExpandido(expandido === ideia.id ? null : ideia.id)}
                            className="flex items-center gap-1 text-[9px] text-slate-600 hover:text-slate-400 transition-colors mb-2 w-fit"
                          >
                            <ChevronDown className={`w-3 h-3 transition-transform ${expandido === ideia.id ? "rotate-180" : ""}`} />
                            {expandido === ideia.id ? "Recolher" : "Ver detalhes"}
                          </button>

                          {expandido === ideia.id && (
                            <p className="text-[11px] text-slate-400 leading-relaxed mb-3 border-t border-slate-700 pt-2">
                              {ideia.descricao}
                            </p>
                          )}

                          {/* Nota do Lucius */}
                          {ideia.notaLucius && (
                            <div className="flex items-start gap-1.5 mb-3 text-[10px] text-blue-300/70 italic">
                              <Bot className="w-3 h-3 flex-shrink-0 mt-0.5 text-blue-400" />
                              {ideia.notaLucius}
                            </div>
                          )}

                          {/* Ações */}
                          {STATUS_NEXT[ideia.status] && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <button
                                onClick={() => moverStatus(ideia)}
                                disabled={movendo === ideia.id}
                                className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-slate-200 border border-slate-600 hover:border-slate-500 px-2.5 py-1 rounded-full transition-all disabled:opacity-50"
                              >
                                {movendo === ideia.id ? <Loader className="w-2.5 h-2.5 animate-spin" /> : <ThumbsUp className="w-2.5 h-2.5" />}
                                {STATUS_LABEL_NEXT[ideia.status]}
                              </button>
                              {ideia.status === "recebida" && (
                                <button
                                  onClick={() => descartar(ideia)}
                                  disabled={movendo === ideia.id}
                                  className="text-[9px] text-slate-700 hover:text-red-500 transition-colors p-1"
                                  title="Descartar"
                                >
                                  <Ban className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Descartadas */}
            {descartadas.length > 0 && (
              <div className="mt-8">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-3">
                  Descartadas ({descartadas.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {descartadas.map((i) => (
                    <span key={i.id} className="text-[10px] text-slate-700 border border-slate-800 px-2.5 py-1 rounded-full line-through">
                      {i.titulo}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
