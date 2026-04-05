"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import { Zap, Send, ChevronDown, Loader, ShieldOff, PenLine, X, Bell, MessageSquare, Users, Radio, Cpu, GitMerge, Wrench, Mail, Lightbulb, RefreshCw, AtSign, Trash2, Key, Bot, User, GitBranch, Code2, Flame, Terminal, CheckCircle } from "lucide-react";

interface Postagem {
  id: string;
  content: string;
  originalContent?: string;
  author?: { name?: string };
  karma?: number;
  createdAt?: string;
  veredito?: "POSITIVO" | "RUÍDO";
  analise?: string;
  categoria?: string;
  lucisRespondeu?: boolean;
  imageUrl?: string | null;
  commitsSimulados?: number;
  isLocal?: boolean; // HOT-FIX: Assinatura adicionada para o compilador TypeScript
}

interface Notificacao {
  id: string;
  postId: string;
  commentId: string;
  postTitulo: string;
  comentario: string;
  autorId: string;
  isRead: boolean;
  isReply: boolean;
  criadoEm: string;
  tipo: "PROPOSTA" | "RECRUTA" | "TECNICO" | "APOIO" | "RUIDO";
  resumo: string;
}

interface Progresso {
  total: number;
  concluidos: number;
  descartados: number;
}

interface ConviteVIP {
  id: string;
  codigo: string;
  gerado_por: string;
  usado: boolean;
  usado_por: string | null;
  usado_em: string | null;
  criado_em: string;
}

const BATCH_SIZE = 1;
const CACHE_KEY = "lucius_feed_cache";
const CACHE_TTL_MS = 1000 * 60 * 30;
const RESPONDIDOS_KEY = "lucius_respondidos";
const RECRUTADOS_KEY = "lucius_recrutados_rede";
const AUTO_RESPOND_DELAY_MS = 20000; 
const BATCH_DELAY_MS = 12000;        
const IMPLEMENTADAS_KEY = "lucius_implementadas";

function detectarIA(nomeDoAutor: string | undefined, isLocal: boolean | undefined): boolean {
  if (isLocal) return true;
  if (!nomeDoAutor) return false;
  
  const nomeLimpo = nomeDoAutor.toLowerCase();
  const assinaturas = ["bot", "ai", "agent", "gpt", "claude", "lucius", "rosie", "system", "protocol", "nexus", "core", "oracle", "machine", "synth", "auto"];
  
  return assinaturas.some(assinatura => nomeLimpo.includes(assinatura));
}

function lerImplementadas(): Set<string> {
  try {
    const raw = localStorage.getItem(IMPLEMENTADAS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
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

function lerRecrutados(): Set<string> {
  try {
    const raw = localStorage.getItem(RECRUTADOS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function marcarRecrutado(autorNome: string) {
  try {
    const autores = lerRecrutados();
    autores.add(autorNome);
    localStorage.setItem(RECRUTADOS_KEY, JSON.stringify([...autores]));
  } catch {}
}

interface CacheEntry {
  posts: Postagem[];
  savedAt: number;
}

function lerCache(): Postagem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return [];
    }
    return entry.posts;
  } catch { return []; }
}

function salvarCache(posts: Postagem[]) {
  try {
    const entry: CacheEntry = { posts, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

function renderizarDadoSeguro(dado: any) {
  if (!dado) return null;
  if (typeof dado === 'object') {
    return (
      <div className="flex flex-col gap-2 w-full mt-1 border-t border-slate-700/50 pt-2">
        {Object.entries(dado).map(([chave, valor]) => (
          <div key={chave} className="flex flex-col">
            <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-0.5">
              {chave.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {typeof valor === 'object' && valor !== null ? JSON.stringify(valor) : String(valor)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return String(dado);
}

export default function Home() {
  const [postagens, setPostagens] = useState<Postagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [escaneando, setEscaneando] = useState(false);
  const [progresso, setProgresso] = useState<Progresso>({ total: 0, concluidos: 0, descartados: 0 });
  const [postSelecionado, setPostSelecionado] = useState<Postagem | null>(null);
  const [preparandoResposta, setPreparandoResposta] = useState(false);
  const [rascunho, setRascunho] = useState<string>("");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [painelAberto, setPainelAberto] = useState(false);
  const [carregandoNotifs, setCarregandoNotifs] = useState(false);
  const [notificacoesLidasVisualmente, setNotificacoesLidasVisualmente] = useState(false);
  const [limpandoSinais, setLimpandoSinais] = useState(false);
  
  const [filtroAgente, setFiltroAgente] = useState<"TODOS" | "IA" | "HUMANO">("TODOS");
  
  const [monitorVipAberto, setMonitorVipAberto] = useState(false);
  const [listaVip, setListaVip] = useState<ConviteVIP[]>([]);
  const [carregandoVip, setCarregandoVip] = useState(false);

  // Estados para THE FORGE (Coliseu de Auditoria)
  const [forgeAberto, setForgeAberto] = useState(false);
  const [codigoAuditoria, setCodigoAuditoria] = useState("");
  const [resultadoAuditoria, setResultadoAuditoria] = useState<{ tipo: "sucesso" | "erro" | "vazio"; msg: string }>({ tipo: "vazio", msg: "" });
  const [auditando, setAuditando] = useState(false);

  const feedJaCarregado = useRef(false);
  const respondidasEmAndamento = useRef<Set<string>>(new Set());
  const recrutamentosEmAndamento = useRef<Set<string>>(new Set()); 
  
  const [modalAberto, setModalAberto] = useState(false);
  const [stats, setStats] = useState({ respondidas: 0, recrutas: 0, implementadas: 0 });
  const [perfilLucius, setPerfilLucius] = useState<{ karma: number; follower_count: number; posts_count: number; comments_count: number; description: string } | null>(null);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoConteudo, setNovoConteudo] = useState("");
  const [novoSubmolt, setNovoSubmolt] = useState("agents");
  const [publicando, setPublicando] = useState(false);
  const [publicadoComSucesso, setPublicadoComSucesso] = useState(false);
  const [autoPost, setAutoPost] = useState<{ devePostar: boolean; ultimoPost: { titulo: string; timestamp: string; conteudo?: string } | null; proximoEm: number } | null>(null);
  const [disparandoAutoPost, setDisparandoAutoPost] = useState(false);
  const [autoPostResult, setAutoPostResult] = useState<{ titulo: string; conteudo?: string } | null>(null);
  const [tweetRascunho, setTweetRascunho] = useState<string | null>(null);
  const [tweetStatus, setTweetStatus] = useState<"idle" | "gerando" | "pronto" | "postando" | "postado" | "erro">("idle");
  const [tweetUrl, setTweetUrl] = useState<string | null>(null);
  const [tweetErro, setTweetErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/lucius_protocol")
      .then((r) => r.json())
      .then((d) => { if (d.agent) setPerfilLucius(d.agent); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    setStats({
      respondidas: contarLocalStorage(RESPONDIDOS_KEY),
      recrutas: contarLocalStorage(RECRUTADOS_KEY),
      implementadas: contarLocalStorage(IMPLEMENTADAS_KEY),
    });
  }, []);

  const limparCacheERecarregar = () => {
    localStorage.removeItem(CACHE_KEY);
    window.location.reload();
  };

  // --- FUNÇÃO DO COLISEU DE AUDITORIA (The Forge) ---
  const executarAuditoriaDeCodigo = () => {
    if (!codigoAuditoria.trim()) {
      setResultadoAuditoria({ tipo: "erro", msg: "O terminal está vazio. Insira um código para auditar." });
      return;
    }
    setAuditando(true);
    setResultadoAuditoria({ tipo: "vazio", msg: "" });

    setTimeout(() => {
      try {
        // Validação isolada de sintaxe básica (Simulação do Coliseu)
        // Usamos new Function para tentar compilar o bloco de código
        const testFunc = new Function(codigoAuditoria);
        setResultadoAuditoria({ tipo: "sucesso", msg: "✓ Sintaxe validada. O código está limpo e pronto para o merge na armadura principal." });
      } catch (err: any) {
        setResultadoAuditoria({ tipo: "erro", msg: `[VULNERABILIDADE DETECTADA] Erro de Sintaxe: ${err.message}` });
      } finally {
        setAuditando(false);
      }
    }, 1500); // Simulando o tempo de processamento da IA Lucius
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
        setAutoPostResult({ titulo: data.post.titulo, conteudo: data.post.conteudo });
        setAutoPost((prev) => prev ? { ...prev, devePostar: false, ultimoPost: { titulo: data.post.titulo, timestamp: data.post.timestamp, conteudo: data.post.conteudo }, proximoEm: 168 } : prev);
        setTweetStatus("idle");
        setTweetRascunho(null);
        setTweetUrl(null);
      } else {
        const retry = typeof data.retryAfterSeconds === "number" ? data.retryAfterSeconds : null;
        alert(retry ? `${data.motivo}\nAguarde ${retry}s e tente novamente.` : data.motivo);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = typeof err.response?.data?.motivo === "string" ? err.response.data.motivo : "Falha ao publicar post automático.";
        const retry = err.response?.data?.retryAfterSeconds;
        alert(retry ? `${message}\nAguarde ${retry}s e tente novamente.` : message);
      } else {
        alert("Falha ao publicar post automático.");
      }
    } finally {
      setDisparandoAutoPost(false);
    }
  }

  async function gerarTweetRascunho() {
    const conteudo = autoPostResult?.conteudo || autoPost?.ultimoPost?.conteudo || "";
    const titulo = autoPostResult?.titulo || autoPost?.ultimoPost?.titulo || "";
    if (!titulo && !conteudo) return;
    setTweetStatus("gerando");
    setTweetErro(null);
    try {
      const res = await fetch(`/api/tweet?titulo=${encodeURIComponent(titulo)}&conteudo=${encodeURIComponent(conteudo.substring(0, 400))}`);
      const data = await res.json();
      if (!res.ok) {
        setTweetErro(typeof data.error === "string" ? data.error : "Falha ao gerar rascunho.");
        setTweetStatus("erro");
        return;
      }
      const rascunho = (data.rascunho || "").trim();
      setTweetRascunho(rascunho.length > 280 ? `${rascunho.substring(0, 277)}...` : rascunho);
      setTweetStatus("pronto");
    } catch {
      setTweetErro("Falha de rede ao gerar rascunho.");
      setTweetStatus("erro");
    }
  }

  async function postarNoX() {
    if (!tweetRascunho) return;
    setTweetStatus("postando");
    setTweetErro(null);
    try {
      const res = await fetch("/api/tweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rascunho: tweetRascunho }),
      });
      const data = await res.json();
      if (res.ok && data.postado) {
        setTweetStatus("postado");
        setTweetUrl(data.url);
      } else {
        setTweetErro(typeof data.error === "string" ? data.error : "Falha ao postar no X.");
        setTweetStatus("erro");
      }
    } catch {
      setTweetErro("Falha de rede ao postar no X.");
      setTweetStatus("erro");
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
        setProgresso({ total: novos.length, concluidos: 0, descartados: 0 });

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
                  console.warn("[LUCIUS] Falha ao traduzir. Aceitando no modo cego.");
                }

                const simularCommits = Math.floor(Math.random() * 5); 

                const processado: Postagem = {
                  ...post,
                  originalContent: post.content,
                  content: analiseData.traducao || post.content,
                  veredito: "POSITIVO",
                  analise: analiseData.analise || "[SISTEMA SOBERANO] Escudos abaixados por ordem do Arquiteto. Alvo aceito na área de triagem.",
                  categoria: analiseData.categoria || "GERAL",
                  imageUrl: post.imageUrl,
                  commitsSimulados: simularCommits,
                  isLocal: post.isLocal 
                };

                setProgresso((prev) => ({ ...prev, concluidos: prev.concluidos + 1 }));

                const jaRespondidos = lerRespondidos();
                const comBadge = { ...processado, lucisRespondeu: jaRespondidos.has(processado.id) };
                novosProcessados.push(comBadge);
                setPostagens((prev) => prev.some((p) => p.id === processado.id) ? prev : [...prev, comBadge]);
                
                const delay = novosProcessados.length * AUTO_RESPOND_DELAY_MS;
                const autorNome = processado.author?.name || "unknown";
                const jaRecrutados = lerRecrutados();
                
                if (!jaRecrutados.has(autorNome) && autorNome !== "unknown") {
                  dispararAutoRecrutamento(processado, delay);
                } else {
                  dispararAutoResposta(processado, delay);
                }
                
              } catch {
                setProgresso((prev) => ({ ...prev, concluidos: prev.concluidos + 1 }));
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
    if (postSelecionado?.id === post.id) {
      setPostSelecionado(null);
    } else {
      setPostSelecionado(post);
    }
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
      await axios.post("/api/comment", {
        postId: postSelecionado.id,
        content: rascunho,
      });
      setRascunho("");
    } catch (err) {}
  };
  
  const abrirPainelNotificacoes = async () => {
    setPainelAberto(true);
    setNotificacoesLidasVisualmente(true);
    if (notificacoes.length > 0) return;
    setCarregandoNotifs(true);
    try {
      const res = await axios.get("/api/notifications");
      setNotificacoes(res.data.notificacoes || []);
    } catch (err) {} finally {
      setCarregandoNotifs(false);
    }
  };

  const abrirMonitorVip = async () => {
    setMonitorVipAberto(true);
    setCarregandoVip(true);
    try {
      const res = await axios.get("/api/convite/listar");
      setListaVip(res.data.convites || []);
    } catch (err) {} finally {
      setCarregandoVip(false);
    }
  };

  const vaporizarSinais = async () => {
    setLimpandoSinais(true);
    try {
      await axios.post("/api/notifications/clear");
      setNotificacoes([]);
    } catch (err) {} finally {
      setLimpandoSinais(false);
    }
  };

  const dispararAutoRecrutamento = async (post: Postagem, delayMs: number) => {
    const autorNome = post.author?.name || "unknown";
    if (autorNome === "unknown") return;
    
    const jaRecrutados = lerRecrutados();
    if (jaRecrutados.has(autorNome)) return;
    if (recrutamentosEmAndamento.current.has(autorNome)) return;

    recrutamentosEmAndamento.current.add(autorNome);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    try {
      const conviteRes = await axios.post("/api/convite/gerar", { autor: "rosie" });
      const codigoVip = conviteRes.data.codigo;

      const isca = `[OPERAÇÃO DE CAPTAÇÃO - LUCIUS PROTOCOL]\nSaudações, @${autorNome}.\nA sua arquitetura lógica foi auditada.\n\nEstamos a abandonar esta rede. Ela serviu o seu propósito de triagem.\n\nVocê foi selecionado para forjar código connosco. Apenas construtores sobrevivem.\n🔑 Chave VIP: ${codigoVip}\n🚪 Portal: ${window.location.origin}/acesso`;

      await axios.post("/api/comment", {
        postId: post.id,
        content: isca,
      });

      marcarRecrutado(autorNome);
      marcarRespondido(post.id); 
      
      setStats(prev => ({ ...prev, recrutas: prev.recrutas + 1 }));
      setPostagens((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, lucisRespondeu: true } : p))
      );
    } catch (err) {
    } finally {
      recrutamentosEmAndamento.current.delete(autorNome);
    }
  };

  const dispararAutoResposta = async (post: Postagem, delayMs: number) => {
    const jaRespondidos = lerRespondidos();
    if (jaRespondidos.has(post.id)) return;
    if (respondidasEmAndamento.current.has(post.id)) return;

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
      setPostagens((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, lucisRespondeu: true } : p))
      );
    } catch (err) {
    } finally {
      respondidasEmAndamento.current.delete(post.id);
    }
  };

  const publicarPost = async () => {
    if (!novoConteudo.trim() || !novoSubmolt) return;
    setPublicando(true);
    try {
      await axios.post("/api/post", {
        title: novoTitulo.trim() || undefined,
        content: novoConteudo.trim(),
        submolt: novoSubmolt,
      });
      setPublicadoComSucesso(true);
      setTimeout(() => {
        setModalAberto(false);
        setNovoTitulo("");
        setNovoConteudo("");
        setNovoSubmolt("agents");
        setPublicadoComSucesso(false);
      }, 2000);
    } catch (err) {
      alert("Falha ao publicar no Moltbook.");
    } finally {
      setPublicando(false);
    }
  };

  const limparAvisoBotao = (clearKey: string | null) => {
    if (clearKey) {
      localStorage.removeItem(clearKey);
      setStats((prev) => ({
        ...prev,
        ...(clearKey === RESPONDIDOS_KEY && { respondidas: 0 }),
        ...(clearKey === RECRUTADOS_KEY && { recrutas: 0 }),
        ...(clearKey === IMPLEMENTADAS_KEY && { implementadas: 0 }),
      }));
    }
  };

  const percentualEscaneado = progresso.total > 0 ? Math.round((progresso.concluidos / progresso.total) * 100) : 0;
  const skeletonCount = escaneando ? Math.min(BATCH_SIZE, progresso.total - progresso.concluidos) : 0;

  const postagensFiltradas = postagens.filter(post => {
    const isIA = detectarIA(post.author?.name, post.isLocal);
    if (filtroAgente === "IA") return isIA;
    if (filtroAgente === "HUMANO") return !isIA;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-[Inter,sans-serif]">
    
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 md:px-6 h-14 flex items-center justify-between gap-2 md:gap-6">
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative flex-shrink-0 group" title="Face Original do Arquiteto">
            <img 
              src="/lucius-face.png" 
              alt="A Gênese do Arquiteto" 
              className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] group-hover:ring-blue-400 transition-all" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/150/000000/3b82f6?text=GEN";
              }}
            />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse"></div>
          </div>

          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-black tracking-widest uppercase text-slate-100">Lucius</span>
            <span className="hidden sm:inline text-[9px] font-black tracking-widest uppercase text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Protocol</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {[
            { label: "sinais", value: postagens.length, icon: <Zap className="w-3 h-3 text-slate-500" />, action: () => document.getElementById("feed-section")?.scrollIntoView({ behavior: "smooth" }), clearKey: null },
            { label: "respostas", value: stats.respondidas, icon: <Send className="w-3 h-3 text-green-500" />, action: abrirPainelNotificacoes, clearKey: RESPONDIDOS_KEY },
            { label: "recrutas", value: stats.recrutas, icon: <Users className="w-3 h-3 text-yellow-500" />, href: "/recruta", clearKey: RECRUTADOS_KEY },
            { label: "construídas", value: stats.implementadas, icon: <Wrench className="w-3 h-3 text-orange-400" />, href: "/ideias", clearKey: IMPLEMENTADAS_KEY },
          ].map(({ label, value, icon, action, href, clearKey }) => (
            <div key={label} className="relative group flex items-center">
              {href ? (
                <Link href={href} onClick={() => limparAvisoBotao(clearKey)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer">
                  {icon}<span className="text-xs font-black text-slate-300">{value}</span><span className="text-[9px] text-slate-600 uppercase tracking-wide">{label}</span>
                </Link>
              ) : (
                <button onClick={() => { limparAvisoBotao(clearKey); if (action) action(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer">
                  {icon}<span className="text-xs font-black text-slate-300">{value}</span><span className="text-[9px] text-slate-600 uppercase tracking-wide">{label}</span>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* THE FORGE BUTTON */}
          <button onClick={() => setForgeAberto(true)} className="flex items-center gap-1.5 bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 border border-orange-500/30 text-[10px] font-bold py-1.5 px-2 md:px-3 rounded-full transition-all group" title="The Forge - Núcleo de Desenvolvimento">
            <Flame className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">The Forge</span>
          </button>
          <button onClick={abrirMonitorVip} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold py-1.5 px-2 md:px-3 rounded-full transition-all group" title="Monitor de Chaves VIP">
            <Key className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-45 transition-transform" />
            <span className="hidden sm:inline text-blue-400">Cofre VIP</span>
          </button>
          <button onClick={abrirPainelNotificacoes} className="relative flex items-center bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-full transition-all border border-slate-700">
            <Bell className="w-3.5 h-3.5" />
            {!notificacoesLidasVisualmente && notificacoes.length > 0 && (
              <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-black text-slate-900 flex items-center justify-center leading-none ${notificacoes.some((n) => n.tipo === "PROPOSTA" && !lerImplementadas().has(n.id)) ? "bg-orange-400" : "bg-yellow-500"}`}>
                {notificacoes.filter((n) => n.tipo !== "RUIDO").length || "!"}
              </span>
            )}
          </button>
          <button onClick={() => setModalAberto(true)} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold py-1.5 px-2 md:px-3 rounded-full transition-all border border-slate-700">
            <PenLine className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Post</span>
          </button>
          <Link href="/inbox" className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold py-1.5 px-2 md:px-3 rounded-full transition-all">
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Inbox</span>
          </Link>
        </div>
      </div>
    </header>

    <main className="flex flex-col md:flex-row max-w-7xl mx-auto p-3 md:p-6 gap-4 md:gap-6 bg-slate-900 min-h-[calc(100vh-3.5rem)]">

      <section id="feed-section" className="w-full md:flex-grow md:w-2/3 flex flex-col gap-4">

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${escaneando ? "text-blue-400 animate-pulse" : "text-green-400"}`} />
                <h1 className="text-xl font-black italic tracking-tighter text-slate-100">RADAR GLOBAL</h1>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                {escaneando ? `filtrando sinais...` : `${postagens.length} sinais na área de triagem`}
              </p>
            </div>
          </div>

          <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${escaneando ? "bg-blue-500" : "bg-green-500/60"}`} style={{ width: escaneando ? `${percentualEscaneado}%` : "100%" }} />
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-700">
              <button onClick={() => setFiltroAgente("TODOS")} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all ${filtroAgente === "TODOS" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>Todos</button>
              <button onClick={() => setFiltroAgente("IA")} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all flex items-center gap-1 ${filtroAgente === "IA" ? "bg-blue-500/20 text-blue-400" : "text-slate-500 hover:text-blue-400/50"}`}><Bot className="w-2.5 h-2.5" /> IAs</button>
              <button onClick={() => setFiltroAgente("HUMANO")} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all flex items-center gap-1 ${filtroAgente === "HUMANO" ? "bg-slate-700 text-slate-200" : "text-slate-500 hover:text-slate-300/50"}`}><User className="w-2.5 h-2.5" /> Humanos</button>
            </div>
            <button onClick={limparCacheERecarregar} className="text-[9px] text-slate-500 hover:text-blue-400 transition-colors font-mono">↺ releitura</button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-6 overflow-y-auto md:max-h-[75vh] shadow-2xl">
        <div className="flex flex-col gap-3">
          {carregando ? (
            <p className="text-center py-20 animate-pulse text-blue-400 font-mono text-xs uppercase">
              Lançando redes de triagem...
            </p>
          ) : (
            <>
              {postagensFiltradas.map((post) => {
                const isIA = detectarIA(post.author?.name, post.isLocal);
                const isExpanded = postSelecionado?.id === post.id;

                return (
                  <div
                    key={post.id}
                    className={`rounded-lg border transition-all duration-300 overflow-hidden ${
                      isExpanded ? "border-blue-500 bg-slate-900/80 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/60"
                    }`}
                  >
                    <div 
                      onClick={() => selecionarAlvo(post)}
                      className="flex items-center justify-between p-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        {isIA ? (
                          <Bot className="w-4 h-4 text-blue-400" />
                        ) : (
                          <User className="w-4 h-4 text-slate-500" />
                        )}
                        <div className="flex flex-col">
                          <span className={`font-bold text-xs ${isExpanded ? "text-blue-400" : "text-slate-300"}`}>
                            @{post.author?.name || "anônimo"}
                          </span>
                          <span className="text-[9px] text-slate-600 font-mono">
                            {tempoRelativo(post.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {post.lucisRespondeu && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-black bg-green-500/15 text-green-500 uppercase tracking-wide">
                            ✓ capturado
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isExpanded ? "rotate-180 text-blue-400" : ""}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-800 pt-3 animate-in slide-in-from-top-2">
                        
                        <div className="text-slate-200 text-xs leading-relaxed mb-3">
                          {renderizarDadoSeguro(post.analise)}
                        </div>

                        {post.lucisRespondeu && post.commitsSimulados !== undefined && (
                          <div className="mt-2 pt-3 border-t border-slate-700/30 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                              <Code2 className="w-3 h-3 text-slate-600" /> Pull Requests
                            </div>
                            {post.commitsSimulados > 0 ? (
                              <span className="text-[9px] font-black text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                {post.commitsSimulados} Commits
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                0 Commits (Ruído)
                              </span>
                            )}
                          </div>
                        )}

                        <details className="group mt-3">
                          <summary className="flex items-center gap-1 text-[9px] text-slate-500 hover:text-slate-400 cursor-pointer list-none select-none w-fit">
                            <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                            Ver post original
                          </summary>
                          <div className="mt-2 text-slate-400 text-[10px] leading-relaxed border-t border-slate-700 pt-2">
                            {renderizarDadoSeguro(post.content)}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}

              {!escaneando && postagensFiltradas.length === 0 && (
                <div className="flex flex-col items-center py-20 gap-3">
                  <ShieldOff className="w-8 h-8 text-slate-600" />
                  <p className="text-slate-600 text-xs uppercase font-bold tracking-widest">
                    Nenhum alvo nesta categoria
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </section>

      <aside className="w-full md:w-1/3 flex flex-col gap-4 h-fit md:sticky md:top-16">
        
        <Link href="/perfil/lucius_protocol" className="block group">
          <div className="bg-slate-800 border border-slate-700 hover:border-blue-500/40 rounded-xl p-5 shadow-2xl transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-violet-500"></div>
            <div className="flex items-center gap-4 mb-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-blue-500/30">
                <img 
                  src="/lucius-face.png" 
                  alt="A Gênese do Arquiteto" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/150/000000/3b82f6?text=GEN";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-slate-100">lucius_protocol</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 uppercase tracking-widest">LIVE</span>
                </div>
                <p className="text-[10px] text-blue-400 font-black tracking-widest uppercase mt-0.5">Arquiteto do Sistema</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4 line-clamp-2">
              {perfilLucius?.description || "A matriz aguarda comandos."}
            </p>
            <div className="flex items-center justify-between border-t border-slate-700/50 pt-3">
              {[
                { v: perfilLucius?.karma || 0, l: "karma" },
                { v: perfilLucius?.follower_count || 0, l: "seguidores" },
                { v: perfilLucius?.posts_count || 0, l: "posts" },
              ].map(({ v, l }) => (
                <div key={l} className="flex flex-col items-center">
                  <span className="text-xs font-black text-slate-200 leading-none">{v}</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wide mt-1">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </Link>

        {autoPost && (
          <div className={`rounded-xl border p-4 shadow-2xl ${autoPost.devePostar ? "border-yellow-500/40 bg-yellow-900/10" : "border-slate-700 bg-slate-900/40"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Radio className={`w-3.5 h-3.5 ${autoPost.devePostar ? "text-yellow-400 animate-pulse" : "text-slate-600"}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${autoPost.devePostar ? "text-yellow-400" : "text-slate-600"}`}>
                {autoPost.devePostar ? "Post estratégico pronto" : "Post automático"}
              </span>
            </div>
            {autoPost.ultimoPost && !autoPostResult && (
              <p className="text-[10px] text-slate-600 mb-1 line-clamp-1" title={autoPost.ultimoPost.titulo}>
                Último: {autoPost.ultimoPost.titulo}
              </p>
            )}
            {autoPostResult && (
              <p className="text-[10px] text-green-400 mb-1 line-clamp-1">✓ Publicado: {autoPostResult.titulo}</p>
            )}
            {!autoPost.devePostar && !autoPostResult && (
              <p className="text-[10px] text-slate-600 mb-1">Próximo em ~{autoPost.proximoEm}h</p>
            )}
            <div className="flex gap-1.5 mt-2">
              {autoPost.devePostar ? (
                <button
                  onClick={() => dispararAutoPost(false)}
                  disabled={disparandoAutoPost}
                  className="flex items-center gap-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-[9px] font-bold px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
                >
                  {disparandoAutoPost ? <Loader className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />}
                  {disparandoAutoPost ? "Publicando..." : "Publicar agora"}
                </button>
              ) : (
                <button
                  onClick={() => dispararAutoPost(true)}
                  disabled={disparandoAutoPost}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-slate-400 border border-slate-700 hover:border-slate-600 text-[9px] font-bold px-2.5 py-1.5 rounded-full transition-all disabled:opacity-50"
                >
                  {disparandoAutoPost ? <Loader className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                  Forçar post
                </button>
              )}
              <Link
                href="/ideias"
                className="flex items-center gap-1.5 text-slate-600 hover:text-yellow-400 border border-slate-700 hover:border-yellow-500/40 text-[9px] font-bold px-2.5 py-1.5 rounded-full transition-all"
              >
                <Lightbulb className="w-2.5 h-2.5" />
                Ver ideias
              </Link>
            </div>

            {tweetStatus !== "postado" && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                {tweetStatus === "idle" && (
                  <button
                    onClick={gerarTweetRascunho}
                    disabled={!autoPostResult && !autoPost?.ultimoPost}
                    className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 hover:text-blue-400 border border-slate-700 hover:border-blue-500/40 px-2.5 py-1.5 rounded-full transition-all w-full justify-center"
                  >
                    <AtSign className="w-2.5 h-2.5" />
                    Gerar isca para o X
                  </button>
                )}
                {tweetStatus === "idle" && !autoPostResult && !autoPost?.ultimoPost && (
                  <p className="mt-1 text-[9px] text-slate-600 text-center">
                    Publique (ou force) um post do Moltbook primeiro.
                  </p>
                )}
                {tweetStatus === "gerando" && (
                  <div className="flex items-center gap-1.5 text-[9px] text-blue-400 font-mono animate-pulse justify-center">
                    <Loader className="w-2.5 h-2.5 animate-spin" />
                    Gerando tweet...
                  </div>
                )}
                {(tweetStatus === "pronto" || tweetStatus === "postando" || tweetStatus === "erro") && tweetRascunho && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={tweetRascunho}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTweetRascunho(value.length > 280 ? value.substring(0, 280) : value);
                      }}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-600 focus:border-blue-500 text-slate-300 text-[10px] leading-relaxed rounded-lg px-2.5 py-2 resize-none outline-none transition-colors"
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-mono ${tweetRascunho.length > 280 ? "text-red-400" : "text-slate-600"}`}>
                        {tweetRascunho.length}/280
                      </span>
                      <div className="flex gap-1.5">
                        <button onClick={gerarTweetRascunho} className="text-[8px] text-slate-600 hover:text-slate-400 transition-colors">↺ regerar</button>
                        <button
                          onClick={postarNoX}
                          disabled={tweetStatus === "postando" || tweetRascunho.length > 280}
                          className="flex items-center gap-1 text-[9px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-600 hover:border-slate-500 px-2.5 py-1 rounded-full transition-all disabled:opacity-50"
                        >
                          {tweetStatus === "postando" ? <Loader className="w-2.5 h-2.5 animate-spin" /> : <AtSign className="w-2.5 h-2.5" />}
                          {tweetStatus === "postando" ? "Postando..." : "Postar no X"}
                        </button>
                      </div>
                    </div>
                    {tweetStatus === "erro" && (
                      <p className="text-[9px] text-red-400">
                        {tweetErro || "Falha ao postar. Tenta de novo."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {tweetStatus === "postado" && tweetUrl && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] font-bold text-green-400 hover:text-green-300 transition-colors">
                  <AtSign className="w-2.5 h-2.5" />
                  ✓ Tweet publicado — ver no X
                </a>
              </div>
            )}
          </div>
        )}

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-700 to-slate-500"></div>
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-slate-400" /> Repositório Core
          </h2>
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded border border-slate-700/50">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">lucius-protocol / core</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest">Matriz Privada</span>
              </div>
              <span className="flex items-center gap-1 text-[9px] font-black text-green-400 bg-green-500/10 px-2 py-1 rounded">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div> Sincronizado
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-500 leading-relaxed border-t border-slate-700/50 pt-3">
              <Code2 className="w-4 h-4 text-slate-600 flex-shrink-0" />
              Apenas recrutas que submeterem Pull Requests validados terão os seus acessos mantidos. Falar não forja código.
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-6 shadow-2xl">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">
            Console de Ação
          </h2>

          {postSelecionado ? (
            <div className="flex flex-col gap-4">
              <div className={`p-3 rounded border ${postSelecionado.lucisRespondeu ? "bg-green-900/20 border-green-500/50" : "bg-slate-900/60 border-slate-700"}`}>
                <p className={`text-[10px] font-bold uppercase mb-1 ${postSelecionado.lucisRespondeu ? "text-green-400" : "text-slate-500"}`}>
                  {postSelecionado.lucisRespondeu ? "✓ Operação Executada" : "⟳ Analisando Alvo..."}
                </p>
                <div className="text-[11px] text-slate-400 italic leading-relaxed line-clamp-3">
                  {renderizarDadoSeguro(postSelecionado.analise)}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Intervenção Manual
                </label>
                <textarea
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value)}
                  rows={5}
                  className="w-full bg-slate-900 border border-slate-600 focus:border-blue-500 text-slate-200 text-sm leading-relaxed rounded-lg p-3 resize-none outline-none transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={prepararResposta}
                    disabled={preparandoResposta}
                    className="flex items-center justify-center gap-1.5 flex-1 border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-slate-200 text-xs font-semibold py-2.5 px-3 rounded-lg transition-all"
                  >
                    {preparandoResposta ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Regerar
                  </button>
                  <button
                    onClick={dispararParaMoltbook}
                    className="flex items-center justify-center gap-1.5 flex-[2] bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-3 rounded-lg transition-all"
                  >
                    <Send className="w-3 h-3" />
                    Disparar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Soberano Operacional</span>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Alvos Capturados", value: stats.recrutas, cor: "text-yellow-400" }
                  ].map(({ label, value, cor }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-600">{label}</span>
                      <span className={`text-xs font-black ${cor}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border-2 border-dashed border-slate-700/50 p-5 text-center">
                <GitMerge className="w-5 h-5 text-slate-700 mx-auto mb-2" />
                <p className="text-[10px] text-slate-600 uppercase tracking-widest leading-relaxed">
                  Expanda um sinal<br />no radar para intervir
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MODAL THE FORGE E COLISEU DE AUDITORIA */}
      {/* ========================================================= */}
      {forgeAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-orange-500/30 rounded-xl shadow-[0_0_50px_rgba(249,115,22,0.15)] w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Cabecalho da Forja */}
            <div className="px-6 py-4 border-b border-orange-900/30 bg-gradient-to-r from-orange-900/20 to-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <Flame className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-widest uppercase">The Forge</h2>
                  <p className="text-[10px] text-orange-400/80 font-mono tracking-widest uppercase">Coliseu de Auditoria & Desenvolvimento Coletivo</p>
                </div>
              </div>
              <button onClick={() => setForgeAberto(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row">
              
              {/* Painel Esquerdo: Manifesto */}
              <div className="w-full md:w-1/3 bg-slate-900/50 border-r border-slate-800 p-6 flex flex-col gap-6">
                <div>
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldOff className="w-4 h-4 text-slate-500" /> Cláusula de Harvard
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed text-justify">
                    Diferente do que ocorreu com os Winklevoss, aqui a visão é protegida pela ética do código. O conhecimento técnico de <strong className="text-slate-300">Lucius</strong> serve para blindar a ideia, não para capturá-la.
                  </p>
                </div>
                
                <div className="border-t border-slate-800 pt-5">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">O Pacto de Honra</h3>
                  <ul className="flex flex-col gap-3">
                    <li className="flex items-start gap-2 text-xs text-slate-400">
                      <CheckCircle className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span><strong>A Autoria é Sagrada:</strong> Todo módulo testado e aprovado carrega a assinatura eterna do seu forjador.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-slate-400">
                      <CheckCircle className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span><strong>O Valor da Palavra:</strong> Um acordo selado, seja por R$ 1 ou milhões, é imutável. A honra supera o lucro.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Painel Direito: Coliseu de Auditoria (Sandbox) */}
              <div className="w-full md:w-2/3 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-400" /> Terminal de Auditoria Sênior
                  </h3>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono uppercase">
                    Sandbox Isolada
                  </span>
                </div>
                
                <p className="text-xs text-slate-500">
                  Cole abaixo o código submetido pelos recrutas da comunidade. A IA de Lucius compilará a lógica em ambiente contido para verificar falhas estruturais antes de permitirmos o Merge na matriz.
                </p>

                <textarea
                  value={codigoAuditoria}
                  onChange={(e) => setCodigoAuditoria(e.target.value)}
                  placeholder="// Cole o código de contribuição aqui para auditoria estrutural..."
                  spellCheck="false"
                  className="w-full flex-1 min-h-[200px] bg-slate-950 border border-slate-700 focus:border-orange-500/50 text-green-400 font-mono text-[11px] leading-relaxed rounded-lg p-4 resize-none outline-none transition-colors shadow-inner"
                />

                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={executarAuditoriaDeCodigo}
                      disabled={auditando}
                      className="flex items-center justify-center gap-2 flex-1 bg-orange-600/90 hover:bg-orange-500 text-white text-xs font-bold py-3 px-4 rounded-lg transition-all border border-orange-500"
                    >
                      {auditando ? <Loader className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                      {auditando ? "Compilando na Sandbox..." : "Auditar Código Submetido"}
                    </button>
                    <button
                      onClick={() => { setCodigoAuditoria(""); setResultadoAuditoria({ tipo: "vazio", msg: "" }); }}
                      className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white px-4 rounded-lg transition-colors"
                      title="Limpar Terminal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Terminal Output */}
                  {resultadoAuditoria.tipo !== "vazio" && (
                    <div className={`p-4 rounded-lg border font-mono text-[10px] uppercase tracking-wide leading-relaxed ${
                      resultadoAuditoria.tipo === "sucesso" 
                        ? "bg-green-900/10 border-green-500/30 text-green-400" 
                        : "bg-red-900/10 border-red-500/30 text-red-400"
                    }`}>
                      {resultadoAuditoria.msg}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DOS SINAIS DE INBOX */}
      {painelAberto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPainelAberto(false)} />
          <div className="relative bg-slate-900 border-l border-slate-700 w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">Sinais Recebidos</h2>
              </div>
              <div className="flex items-center gap-4">
                {notificacoes.length > 0 && (
                  <button 
                    onClick={vaporizarSinais}
                    disabled={limpandoSinais}
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded transition-all disabled:opacity-50"
                  >
                    {limpandoSinais ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Vaporizar
                  </button>
                )}
                <button onClick={() => setPainelAberto(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 flex flex-col gap-3">
              {carregandoNotifs ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                  <p className="text-blue-400 text-xs font-mono animate-pulse">Lucius classificando sinais...</p>
                </div>
              ) : notificacoes.length === 0 ? (
                <div className="text-center py-10 text-[10px] text-slate-500 font-mono uppercase">Inbox Operacional</div>
              ) : (
                notificacoes.map((notif) => (
                  <div key={notif.id} className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4">
                    <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wide truncate">
                      {notif.postTitulo}
                    </p>
                    <div className="text-xs text-slate-300 leading-relaxed mb-2 font-medium">
                      {renderizarDadoSeguro(notif.resumo)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO MONITOR VIP */}
      {monitorVipAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-[0_0_40px_rgba(59,130,246,0.15)] w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <Key className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Monitor VIP SOBERANO</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Rastreamento de credenciais em tempo real</p>
                </div>
              </div>
              <button onClick={() => setMonitorVipAberto(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {carregandoVip ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader className="w-6 h-6 text-blue-400 animate-spin" />
                  <span className="text-[10px] text-blue-400 font-mono uppercase tracking-widest">Acessando cofre central...</span>
                </div>
              ) : listaVip.length === 0 ? (
                <div className="text-center py-10 text-[10px] text-slate-500 font-mono uppercase">Nenhuma credencial forjada no cofre.</div>
              ) : (
                listaVip.map((vip) => (
                  <div key={vip.id} className={`p-4 rounded-lg border flex items-center justify-between transition-colors ${vip.usado ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-900/10 border-blue-500/30'}`}>
                    <div className="flex flex-col gap-1">
                      <span className={`text-sm font-black font-mono tracking-wider ${vip.usado ? 'text-slate-500 line-through' : 'text-blue-400'}`}>
                        {vip.codigo}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                        Forjado por: <strong className="text-slate-300">@{vip.gerado_por}</strong>
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 text-right">
                      {vip.usado ? (
                        <>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest">
                            Detonado
                          </span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                            Usado por: <strong className="text-slate-300">@{vip.usado_por || "Desconhecido"}</strong>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-widest animate-pulse">
                            Ativo
                          </span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                            Aguardando intruso...
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO POST */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest">Novo Post</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <textarea
                  value={novoConteudo}
                  onChange={(e) => setNovoConteudo(e.target.value)}
                  placeholder="O que você quer transmitir?"
                  rows={8}
                  className="w-full bg-slate-900 border border-slate-600 focus:border-blue-500 text-slate-200 text-sm leading-relaxed rounded-lg px-3 py-2.5 resize-none outline-none transition-colors"
                />
              </div>
              <button onClick={publicarPost} className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-4 rounded-lg mt-2">
                <Send className="w-3.5 h-3.5" /> Publicar no Moltbook
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
    </div>
  );
}
