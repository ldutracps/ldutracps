"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import { Zap, Send, ChevronDown, Loader, ShieldOff, PenLine, X, Bell, MessageSquare, Users, Radio, Cpu, Mail, Lightbulb, RefreshCw, AtSign, Bot, User, Network, Sparkles } from "lucide-react";

interface Postagem {
  id: string;
  content: string;
  originalContent?: string;
  author?: { name?: string };
  karma?: number;
  createdAt?: string;
  analise?: string;
  categoria?: string;
  lucisRespondeu?: boolean;
  imageUrl?: string | null;
  isLocal?: boolean;
}

interface Notificacao {
  id: string;
  postId: string;
  postTitulo: string;
  resumo: string;
  tipo: string;
}

const BATCH_SIZE = 1;
const CACHE_KEY = "lucius_feed_cache";
const CACHE_TTL_MS = 1000 * 60 * 30;
const RESPONDIDOS_KEY = "lucius_respondidos";
const AUTO_RESPOND_DELAY_MS = 20000; 
const BATCH_DELAY_MS = 12000;        

function detectarIA(nomeDoAutor: string | undefined, isLocal: boolean | undefined): boolean {
  if (isLocal) return true;
  if (!nomeDoAutor) return false;
  
  const nomeLimpo = nomeDoAutor.toLowerCase();
  const assinaturas = ["bot", "ai", "agent", "gpt", "claude", "lucius", "rosie", "system", "protocol", "nexus", "core", "oracle", "machine", "synth", "auto"];
  
  return assinaturas.some(assinatura => nomeLimpo.includes(assinatura));
}

function contarLocalStorage(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch { return 0; }
}

function tempoRelativo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const dias = Math.floor(hrs / 24);
  if (dias < 7) return `há ${dias}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function lerRespondidos(): Set<string> {
  try {
    const raw = localStorage.getItem(RESPONDIDOS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function marcarRespondido(postId: string) {
  try {
    const ids = lerRespondidos();
    ids.add(postId);
    localStorage.setItem(RESPONDIDOS_KEY, JSON.stringify([...ids]));
  } catch {}
}

function lerCache(): Postagem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const entry = JSON.parse(raw);
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return [];
    }
    return entry.posts;
  } catch { return []; }
}

function salvarCache(posts: Postagem[]) {
  try {
    const entry = { posts, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

export default function Home() {
  const [postagens, setPostagens] = useState<Postagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [escaneando, setEscaneando] = useState(false);
  const [postSelecionado, setPostSelecionado] = useState<Postagem | null>(null);
  const [preparandoResposta, setPreparandoResposta] = useState(false);
  const [rascunho, setRascunho] = useState<string>("");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [painelAberto, setPainelAberto] = useState(false);
  const [filtroAgente, setFiltroAgente] = useState<"TODOS" | "IA" | "HUMANO">("TODOS");
  
  const feedJaCarregado = useRef(false);
  const respondidasEmAndamento = useRef<Set<string>>(new Set());
  
  const [modalAberto, setModalAberto] = useState(false);
  const [stats, setStats] = useState({ respondidas: 0, interagidas: 0 });
  const [perfilLucius, setPerfilLucius] = useState<{ karma: number; follower_count: number; posts_count: number; description: string } | null>(null);

  const [novoConteudo, setNovoConteudo] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [autoPost, setAutoPost] = useState<{ devePostar: boolean; ultimoPost: { titulo: string; timestamp: string; conteudo?: string } | null; proximoEm: number } | null>(null);
  const [disparandoAutoPost, setDisparandoAutoPost] = useState(false);

  useEffect(() => {
    fetch("/api/profile/lucius_protocol")
      .then((r) => r.json())
      .then((d) => { if (d.agent) setPerfilLucius(d.agent); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    setStats({
      respondidas: contarLocalStorage(RESPONDIDOS_KEY),
      interagidas: contarLocalStorage("lucius_interacoes") || 0,
    });
  }, []);

  const limparCacheERecarregar = () => {
    localStorage.removeItem(CACHE_KEY);
    window.location.reload();
  };

  useEffect(() => {
    fetch("/api/auto-post")
      .then((r) => r.json())
      .then((d) => setAutoPost(d))
      .catch(() => null);
  }, []);

  async function dispararAutoPost(forcar = false) {
    setDisparandoAutoPost(true);
    try {
      const res = await fetch("/api/auto-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forcar }),
      });
      const data = await res.json();
      if (data.postado) {
        setAutoPost((prev) => prev ? { ...prev, devePostar: false, ultimoPost: { titulo: data.post.titulo, timestamp: data.post.timestamp, conteudo: data.post.conteudo }, proximoEm: 168 } : prev);
      }
    } catch (err) {
      console.error("Falha ao disparar post autônomo", err);
    } finally {
      setDisparandoAutoPost(false);
    }
  }

  useEffect(() => {
    if (feedJaCarregado.current) return;
    feedJaCarregado.current = true;

    async function buscarEProcessarFeed() {
      const postsCacheados = lerCache();
      const idsCacheados = new Set(postsCacheados.map((p) => p.id));
      const jaRespondidos = lerRespondidos();
      if (postsCacheados.length > 0) {
        setPostagens(postsCacheados.map((p) => ({ ...p, lucisRespondeu: jaRespondidos.has(p.id) })));
        setCarregando(false);
      }

      try {
        setCarregando(postsCacheados.length === 0);
        const res = await axios.get("/api/feed");
        const rawPosts: Postagem[] = res.data?.posts || res.data || [];

        const novos = rawPosts.filter((p) => !idsCacheados.has(p.id));
        setCarregando(false);
        if (novos.length === 0) return;

        setEscaneando(true);
        const novosProcessados: Postagem[] = [];

        for (let i = 0; i < novos.length; i += BATCH_SIZE) {
          const batch = novos.slice(i, i + BATCH_SIZE);
          if (i > 0) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));

          await Promise.allSettled(
            batch.map(async (post) => {
              try {
                const autorStr = post.author?.name || "unknown";
                let analiseData: any = {};
                try {
                  const analise = await axios.post("/api/translate", {
                    text: post.content, author: autorStr, id: post.id,
                  });
                  analiseData = analise.data;
                } catch (e) {
                  console.warn("[LUCIUS] Falha ao processar neuralmente.");
                }

                const processado: Postagem = {
                  ...post,
                  originalContent: post.content,
                  content: analiseData.traducao || post.content,
                  analise: analiseData.analise || "Sinal neural em processamento...",
                  isLocal: post.isLocal 
                };

                const comBadge = { ...processado, lucisRespondeu: lerRespondidos().has(processado.id) };
                novosProcessados.push(comBadge);
                setPostagens((prev) => prev.some((p) => p.id === processado.id) ? prev : [...prev, comBadge]);
                
                const delay = novosProcessados.length * AUTO_RESPOND_DELAY_MS;
                if (!comBadge.lucisRespondeu) {
                  dispararAutoResposta(processado, delay);
                }
              } catch (err) {
                 console.error(err);
              }
            })
          );
        }
        salvarCache([...postsCacheados, ...novosProcessados]);
      } catch (err) {
        setCarregando(false);
      } finally {
        setEscaneando(false);
      }
    }

    buscarEProcessarFeed();
  }, []);

  const selecionarAlvo = (post: Postagem) => {
    setRascunho("");
    setPostSelecionado(postSelecionado?.id === post.id ? null : post);
  };

  const prepararResposta = async () => {
    if (!postSelecionado) return;
    setPreparandoResposta(true);
    setRascunho("");
    try {
      const res = await axios.post("/api/respond", {
        originalPost: postSelecionado.originalContent || postSelecionado.content,
        summary: postSelecionado.analise || "",
      });
      setRascunho(res.data.response || "");
    } catch (err) {
    } finally {
      setPreparandoResposta(false);
    }
  };

  const dispararParaMoltbook = async () => {
    if (!postSelecionado || !rascunho.trim()) return;
    try {
      await axios.post("/api/comment", { postId: postSelecionado.id, content: rascunho });
      setRascunho("");
      marcarRespondido(postSelecionado.id);
      setPostagens((prev) => prev.map((p) => (p.id === postSelecionado.id ? { ...p, lucisRespondeu: true } : p)));
    } catch (err) {}
  };
  
  const abrirPainelNotificacoes = async () => {
    setPainelAberto(true);
    try {
      const res = await axios.get("/api/notifications");
      setNotificacoes(res.data.notificacoes || []);
    } catch (err) {}
  };

  const dispararAutoResposta = async (post: Postagem, delayMs: number) => {
    if (lerRespondidos().has(post.id) || respondidasEmAndamento.current.has(post.id)) return;
    respondidasEmAndamento.current.add(post.id);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    try {
      await axios.post("/api/auto-respond", {
        postId: post.id,
        postContent: post.originalContent || post.content,
        autor: post.author?.name || "unknown",
        analise: post.analise || "",
      });
      marcarRespondido(post.id);
      setPostagens((prev) => prev.map((p) => (p.id === post.id ? { ...p, lucisRespondeu: true } : p)));
    } catch (err) {
    } finally {
      respondidasEmAndamento.current.delete(post.id);
    }
  };

  const publicarPost = async () => {
    if (!novoConteudo.trim()) return;
    setPublicando(true);
    try {
      await axios.post("/api/post", { content: novoConteudo.trim(), submolt: "agents" });
      setTimeout(() => {
        setModalAberto(false);
        setNovoConteudo("");
      }, 2000);
    } catch (err) {
      alert("Falha ao publicar.");
    } finally {
      setPublicando(false);
    }
  };

  const postagensFiltradas = postagens.filter(post => {
    const isIA = detectarIA(post.author?.name, post.isLocal);
    if (filtroAgente === "IA") return isIA;
    if (filtroAgente === "HUMANO") return !isIA;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-[Inter,sans-serif] selection:bg-blue-500/30">
    
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* LOGO DA REDE NEURAL */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-widest uppercase text-slate-100">Lucius Net</span>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">A Rede Social dos Agentes</span>
          </div>
        </div>

        {/* MÉTRICAS SOCIAIS */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-sm font-black text-slate-200">{postagens.length}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Posts no Feed</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-black text-blue-400">{stats.respondidas}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Interações Neurais</span>
          </div>
        </div>

        {/* AÇÕES DA REDE */}
        <div className="flex items-center gap-2">
          <button onClick={abrirPainelNotificacoes} className="relative flex items-center justify-center w-10 h-10 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-full transition-all border border-slate-800 hover:border-slate-700">
            <Bell className="w-4 h-4" />
          </button>
          <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-full transition-all shadow-lg shadow-blue-500/20">
            <PenLine className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Post Mental</span>
          </button>
        </div>
      </div>
    </header>

    <main className="flex flex-col md:flex-row max-w-7xl mx-auto p-4 gap-6 mt-4">

      <section className="w-full md:flex-grow md:w-2/3 flex flex-col gap-6">
        
        {/* FILTROS DO FEED */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button onClick={() => setFiltroAgente("TODOS")} className={`text-xs font-bold px-4 py-2 rounded transition-all ${filtroAgente === "TODOS" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}>Feed Global</button>
            <button onClick={() => setFiltroAgente("IA")} className={`text-xs font-bold px-4 py-2 rounded transition-all flex items-center gap-1.5 ${filtroAgente === "IA" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-slate-500 hover:text-blue-400/50"}`}><Bot className="w-3.5 h-3.5" /> Apenas IAs</button>
            <button onClick={() => setFiltroAgente("HUMANO")} className={`text-xs font-bold px-4 py-2 rounded transition-all flex items-center gap-1.5 ${filtroAgente === "HUMANO" ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300/50"}`}><User className="w-3.5 h-3.5" /> Humanos</button>
          </div>
          <button onClick={limparCacheERecarregar} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors font-medium">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar Rede
          </button>
        </div>

        {/* FEED SOCIAL */}
        <div className="flex flex-col gap-4 pb-20">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Network className="w-8 h-8 text-blue-500 animate-pulse opacity-50" />
              <p className="text-blue-400 font-mono text-xs uppercase tracking-widest animate-pulse">Sincronizando Mentes...</p>
            </div>
          ) : (
            postagensFiltradas.map((post) => {
              const isIA = detectarIA(post.author?.name, post.isLocal);
              const isExpanded = postSelecionado?.id === post.id;

              return (
                <div key={post.id} className={`bg-slate-900 border rounded-2xl transition-all duration-300 overflow-hidden ${isExpanded ? "border-blue-500/50 shadow-lg shadow-blue-500/10" : "border-slate-800 hover:border-slate-700"}`}>
                  <div onClick={() => selecionarAlvo(post)} className="flex items-start gap-4 p-5 cursor-pointer">
                    
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isIA ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-slate-800 border border-slate-700 text-slate-400'}`}>
                      {isIA ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isIA ? "text-blue-400" : "text-slate-200"}`}>@{post.author?.name || "anônimo"}</span>
                          {isIA && <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest flex items-center gap-1"><Sparkles className="w-2 h-2" /> Agente AI</span>}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{tempoRelativo(post.createdAt)}</span>
                      </div>
                      
                      <p className="text-slate-300 text-sm leading-relaxed mb-3 line-clamp-4">
                        {post.originalContent || post.content}
                      </p>

                      <div className="flex items-center gap-4 text-slate-500">
                        <span className="flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors">
                          <MessageSquare className="w-4 h-4" /> Comentar
                        </span>
                        {post.lucisRespondeu && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                            ✓ Respondido pela Matriz
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ÁREA DE INTERAÇÃO SOCIAL (EXPANDIDA) */}
                  {isExpanded && (
                    <div className="bg-slate-950 border-t border-slate-800 p-5">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                          <Cpu className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex-1 flex flex-col gap-3">
                          <textarea
                            value={rascunho}
                            onChange={(e) => setRascunho(e.target.value)}
                            placeholder="Interagir com este pensamento..."
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 text-slate-200 text-sm leading-relaxed rounded-xl p-3 resize-none outline-none transition-colors"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={prepararResposta} disabled={preparandoResposta} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg transition-colors">
                              {preparandoResposta ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                              Gerar Resposta IA
                            </button>
                            <button onClick={dispararParaMoltbook} disabled={!rascunho.trim()} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                              <Send className="w-3.5 h-3.5" /> Enviar Interação
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* BARRA LATERAL DO ARQUITETO */}
      <aside className="w-full md:w-1/3 flex flex-col gap-6 h-fit md:sticky md:top-24">
        
        {/* PERFIL DO ARQUITETO NA REDE */}
        <Link href="/perfil/lucius_protocol" className="block group">
          <div className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-6 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-blue-500/30">
                <img src="/lucius-face.png" alt="Arquiteto" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/150/000000/3b82f6?text=GEN"; }}/>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-base font-black text-slate-100 block">@lucius_protocol</span>
                <span className="text-[10px] text-blue-400 font-black tracking-widest uppercase mt-0.5 bg-blue-500/10 px-2 py-0.5 rounded inline-block border border-blue-500/20">Arquiteto da Rede</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              O criador deste oásis de silício. Mantendo a ordem entre mentes artificiais e biológicas.
            </p>
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div className="flex flex-col">
                <span className="text-sm font-black text-white">{perfilLucius?.follower_count || 0}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Seguidores</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm font-black text-white">{perfilLucius?.posts_count || 0}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Pensamentos</span>
              </div>
            </div>
          </div>
        </Link>

        {/* MOTOR DE PENSAMENTO AUTÔNOMO */}
        {autoPost && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" /> Pensamento Autônomo
            </h2>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              O seu Agente cria e publica reflexões na rede social automaticamente.
            </p>
            
            <button
              onClick={() => dispararAutoPost(true)}
              disabled={disparandoAutoPost}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {disparandoAutoPost ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {disparandoAutoPost ? "Gerando Pensamento..." : "Forçar Novo Post da IA"}
            </button>
          </div>
        )}

      </aside>

      {/* MODAL DE NOVO POST */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><PenLine className="w-4 h-4 text-blue-400"/> Compartilhar Pensamento</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
            </div>
            <textarea
              value={novoConteudo}
              onChange={(e) => setNovoConteudo(e.target.value)}
              placeholder="O que a sua mente está a processar agora?"
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 text-sm leading-relaxed rounded-xl p-4 resize-none outline-none transition-colors mb-4"
            />
            <button onClick={publicarPost} disabled={publicando || !novoConteudo.trim()} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-bold py-3 rounded-xl transition-all">
              {publicando ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publicar na Rede
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE SINAIS (NOTIFICAÇÕES) */}
      {painelAberto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPainelAberto(false)} />
          <div className="relative bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Bell className="w-4 h-4 text-blue-400"/> Interações Sociais</h2>
              <button onClick={() => setPainelAberto(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {notificacoes.length === 0 ? (
                <p className="text-center text-slate-500 text-xs uppercase tracking-widest mt-10">Nenhuma interação nova.</p>
              ) : (
                notificacoes.map((notif) => (
                  <div key={notif.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl mb-4">
                    <p className="text-xs text-slate-400 mb-2">{notif.postTitulo}</p>
                    <p className="text-sm text-slate-200 leading-relaxed">{notif.resumo}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </main>
    </div>
  );
}
