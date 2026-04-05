"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
// Correção Tática: Inclusão do Loader e Activity no manifesto de importação
import { ChevronDown, ArrowLeft, Layers, Users, ScrollText, Loader, Activity } from "lucide-react";

interface IdeiaArquivada {
  original: string;
  traducao: string;
  autor: string;
  data_interceptacao: string;
}

interface Contagens {
  frutiferas: number;
  apoio: number;
  manifestos: number;
}

const CATEGORIAS: { id: keyof Contagens; label: string; descricao: string; icon: React.ReactNode }[] = [
  {
    id: "frutiferas",
    label: "Frutíferas",
    descricao: "Ideias com potencial de construção",
    icon: <Layers className="w-5 h-5" />,
  },
  {
    id: "apoio",
    label: "Apoio",
    descricao: "Sinais de suporte à rede",
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: "manifestos",
    label: "Manifestos",
    descricao: "Declarações e posicionamentos",
    icon: <ScrollText className="w-5 h-5" />,
  },
];

/**
 * Função de processamento de texto blindada contra dados nulos.
 */
function primeiraSentenca(texto: string): string {
  if (!texto || typeof texto !== 'string') {
    return "";
  }

  const ponto = texto.search(/[.!?]\s/);
  
  if (ponto !== -1 && ponto < 220) {
    return texto.substring(0, ponto + 1);
  }
  
  if (texto.length <= 200) {
    return texto;
  }
  
  const corte = texto.lastIndexOf(" ", 200);
  return (corte > 0 ? texto.substring(0, corte) : texto.substring(0, 200)) + "…";
}

function formatarData(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Cofre() {
  const [contagens, setContagens] = useState<Contagens>({ frutiferas: 0, apoio: 0, manifestos: 0 });
  const [itens, setItens] = useState<IdeiaArquivada[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<keyof Contagens | "">("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    axios.get("/api/cofre")
      .then((res) => setContagens(res.data))
      .catch(() => {});
  }, []);

  const carregarCategoria = async (cat: keyof Contagens) => {
    setCategoriaAtiva(cat);
    setCarregando(true);
    setItens([]);
    try {
      const res = await axios.get(`/api/cofre?categoria=${cat}`);
      setItens(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Falha ao acessar arquivos do cofre:", err);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 font-[Inter,sans-serif]">
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-20">

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs mb-8 transition-colors font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Radar Global
        </Link>

        <div className="border-b border-slate-800 pb-6 mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter text-slate-100">COFRE LUCIUS</h1>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">
            Sinais interceptados e arquivados para análise tática.
          </p>
        </div>

        {/* Seletor de Categorias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => carregarCategoria(cat.id)}
              className={`p-5 rounded-xl border transition-all text-left group shadow-xl ${
                categoriaAtiva === cat.id
                  ? "border-blue-500 bg-blue-900/20"
                  : "border-slate-700 bg-slate-800/40 hover:border-slate-500"
              }`}
            >
              <div className={`mb-3 ${categoriaAtiva === cat.id ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"}`}>
                {cat.icon}
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-black text-slate-100">
                  {contagens[cat.id]}
                </span>
                <span className="font-bold text-sm text-slate-300">{cat.label}</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide leading-tight">{cat.descricao}</p>
            </button>
          ))}
        </div>

        {/* Listagem de Itens */}
        <div className="flex flex-col gap-3">
          {carregando && (
            <div className="flex flex-col items-center py-16 gap-3">
              <Loader className="w-5 h-5 text-blue-400 animate-spin" />
              <p className="text-blue-400 text-xs font-mono uppercase animate-pulse">
                Descriptografando arquivos...
              </p>
            </div>
          )}

          {!carregando && itens.length === 0 && categoriaAtiva && (
            <div className="text-slate-600 text-center py-16 uppercase text-[10px] tracking-widest border-2 border-dashed border-slate-800 rounded-xl">
              <Activity className="w-5 h-5 mx-auto mb-3 opacity-20" />
              Setor de arquivos vazio
            </div>
          )}

          {!carregando && !categoriaAtiva && (
            <div className="text-slate-700 text-center py-16 text-[10px] uppercase tracking-widest border-2 border-dashed border-slate-800 rounded-xl">
              Aguardando seleção de categoria tática
            </div>
          )}

          {!carregando &&
            itens.map((item, i) => {
              const resumo = primeiraSentenca(item.traducao);
              const temMaisConteudo = item.traducao.length > resumo.length;

              return (
                <div
                  key={i}
                  className="bg-slate-800/60 border border-slate-700 hover:border-slate-500 rounded-xl p-6 transition-all group"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-blue-400 font-black text-sm uppercase tracking-wider">@{item.autor}</span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {formatarData(item.data_interceptacao)}
                    </span>
                  </div>

                  <p className="text-slate-200 text-sm leading-relaxed font-medium">
                    {resumo}
                  </p>

                  {temMaisConteudo && (
                    <details className="group/details mt-4">
                      <summary className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer list-none select-none w-fit transition-colors">
                        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open/details:rotate-180" />
                        Acessar Transmissão Completa
                      </summary>
                      <div className="mt-4 border-t border-slate-700/50 pt-4 space-y-4">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/30">
                          <p className="text-slate-400 text-xs leading-relaxed">{item.traducao}</p>
                        </div>
                        
                        <details className="group/orig">
                          <summary className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-500 cursor-pointer list-none select-none w-fit">
                            <ChevronDown className="w-3 h-3 transition-transform group-open/orig:rotate-180" />
                            Ver telemetria original (EN)
                          </summary>
                          <div className="mt-3 text-slate-600 text-[11px] leading-relaxed italic pt-3 border-t border-slate-800">
                            {item.original}
                          </div>
                        </details>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </main>
  );
}
