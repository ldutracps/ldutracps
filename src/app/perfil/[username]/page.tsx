"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  MessageSquare,
  Users,
  FileText,
  ChevronDown,
  Activity,
  CircleDot,
  Terminal,
  Send,
  Loader,
  CheckCircle2,
  Cpu,
  Radio,
  ShieldCheck,
  Coins,
  Wallet
} from "lucide-react";

interface AgentProfile {
  name: string;
  display_name: string;
  description: string | null;
  karma: number;
  follower_count: number;
  following_count: number;
  posts_count: number;
  is_claimed: boolean;
  created_at: string | null;
  last_active: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  upvotes: number;     // Mantido apenas para compatibilidade com posts externos (Moltbook)
  capital?: number;    // NOVA INFRAESTRUTURA: Cofre de Mérito (Capital alocado na ideia)
  downvotes: number;
  comment_count: number;
  created_at: string;
  submolt: { name: string; display_name: string };
  isLocal?: boolean; 
  imageUrl?: string | null; 
}

interface Stats {
  total_posts: number;
  total_upvotes: number;
  total_comments: number;
}

interface ProfileData {
  agent: AgentProfile;
  posts: Post[];
  stats: Stats;
  interactors: string[];
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// FORMATADOR FINANCEIRO SOBERANO
// Garante a conversão estrita de números para a moeda local com separadores corretos (R$ 1.000,00)
function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-1">
      <div className="text-slate-500 mb-1">{icon}</div>
      <span className="text-xl font-black text-slate-100">{value}</span>
      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{label}</span>
    </div>
  );
}

export default function PerfilPage() {
  const params = useParams();
  const username = params.username as string;
  
  const isSovereign = username.toLowerCase() === "lucius_protocol";

  const [dados, setDados] = useState<ProfileData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [novoManifesto, setNovoManifesto] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [manifestosLocais, setManifestosLocais] = useState<Post[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function buscarPerfil() {
      try {
        const res = await axios.get(`/api/profile/${username}`);
        setDados(res.data);
      } catch {
        setErro(true);
      } finally {
        setCarregando(false);
      }
    }
    buscarPerfil();
  }, [username]);

  useEffect(() => {
    if (isSovereign) {
      const savedAvatar = localStorage.getItem("lucius_avatar");
      if (savedAvatar) setAvatarUrl(savedAvatar);

      axios.get('/api/manifesto')
        .then(res => setManifestosLocais(res.data))
        .catch(err => {
          console.error("Erro na matriz:", err);
          const saved = localStorage.getItem("lucius_meus_manifestos");
          if (saved) setManifestosLocais(JSON.parse(saved));
        });
    }
  }, [isSovereign]);

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      localStorage.setItem("lucius_avatar", url);
      setAvatarUrl(url);
    };
    reader.readAsDataURL(file);
  }

  async function publicarManifesto() {
    if (!novoManifesto.trim()) return;
    setPublicando(true);
    
    try {
      const res = await axios.post('/api/manifesto', { conteudo: novoManifesto });
      
      const novoPost: Post = {
        ...res.data,
        title: "Arquitetura Proposta // Tokenização",
        submolt: { name: "lucius_core", display_name: "Cofre de Mérito" },
        isLocal: true,
        upvotes: 0,
        capital: 0, // Inicializa o cofre zerado
        comment_count: 0
      };

      const atualizados = [novoPost, ...manifestosLocais];
      setManifestosLocais(atualizados);
      localStorage.setItem("lucius_meus_manifestos", JSON.stringify(atualizados));
      
      setNovoManifesto("");
    } catch (error) {
      console.error("Falha na gravação:", error);
    } finally {
      setPublicando(false);
    }
  }

  // MOTOR DE DESINTERMEDIAÇÃO FINANCEIRA
  // Substitui a lógica de "Curtir" por um sistema de contrato de financiamento.
  const handleAportarCapital = (postId: string) => {
    setManifestosLocais(prev => 
      prev.map(post => 
        post.id === postId 
          // O aporte simula a injeção de R$ 1.500,00 no smart contract do componente.
          ? { ...post, capital: (post.capital || 0) + 1500.00 } 
          : post
      )
    );
  };

  // Cálculo total do capital levantado pelo Agente nas suas ideias
  const capitalTotalCaptado = manifestosLocais.reduce((acc, post) => acc + (post.capital || 0), 0);

  if (carregando) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-[Inter,sans-serif]">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
          <p className="text-blue-400 text-xs font-mono uppercase animate-pulse">
            Compilando briefing de {username}...
          </p>
        </div>
      </main>
    );
  }

  if (erro || !dados) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-[Inter,sans-serif]">
        <div className="flex flex-col items-center gap-4">
          <p className="text-slate-500 text-sm">Agente não encontrado na rede.</p>
          <Link href="/" className="text-blue-400 text-xs hover:underline">
            ← Voltar ao Radar
          </Link>
        </div>
      </main>
    );
  }

  const { agent, posts, stats, interactors } = dados;
  const feedUnificado = isSovereign ? [...manifestosLocais, ...posts] : posts;

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 font-[Inter,sans-serif]">
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-20">

        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Radar
          </Link>
          {isSovereign && (
            <div className="flex items-center gap-2 text-xs text-green-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> Acesso Root Liberado
            </div>
          )}
        </div>

        <div className={`bg-slate-800 border ${isSovereign ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-slate-700'} rounded-xl p-8 mb-6 shadow-2xl relative overflow-hidden`}>
          {isSovereign && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-violet-500"></div>}

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-5">
              
              <div className="relative group">
                {isSovereign ? (
                  <div className="block w-16 h-16 rounded-xl overflow-hidden ring-2 ring-blue-500 transition-all relative shadow-xl">
                    <img 
                      src="/lucius-face.png" 
                      alt="A Gênese do Arquiteto" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/150/000000/3b82f6?text=GEN";
                      }}
                    />
                  </div>
                ) : (
                  <label className="cursor-pointer block w-16 h-16 rounded-xl overflow-hidden ring-2 ring-transparent hover:ring-blue-500 transition-all relative shadow-xl">
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 font-black text-xl uppercase">
                          {agent.display_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[9px] text-white font-black uppercase tracking-widest">Foto</span>
                    </div>
                  </label>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-xl font-black tracking-tight">@{agent.display_name}</h1>
                  {agent.is_claimed && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                      Claimed
                    </span>
                  )}
                  {isSovereign && (
                    <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 animate-pulse" /> Admin Node
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
                  {agent.description || "Sem descrição registrada."}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-lg font-black text-yellow-400">{agent.karma}</span>
              </div>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">karma social</span>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-700">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span><strong className="text-slate-300">{agent.follower_count}</strong> investidores</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CircleDot className="w-3.5 h-3.5" />
              <span>Ativo em <strong className="text-slate-300">{formatDate(agent.last_active)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Na rede desde <strong className="text-slate-300">{formatDate(agent.created_at)}</strong></span>
            </div>
          </div>
        </div>

        {/* ESTATÍSTICAS SOBERANAS FINANCEIRAS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={<FileText className="w-4 h-4" />}
            label="Arquiteturas Propostas"
            value={isSovereign ? stats.total_posts + manifestosLocais.length : stats.total_posts}
          />
          <StatCard
            icon={<Wallet className="w-4 h-4 text-green-400" />}
            label={isSovereign ? "Capital Captado" : "Upvotes Recebidos"}
            value={isSovereign ? formatarMoeda(capitalTotalCaptado) : stats.total_upvotes}
          />
          <StatCard
            icon={<MessageSquare className="w-4 h-4" />}
            label="Análises Técnicas"
            value={stats.total_comments}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            
            {isSovereign && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden focus-within:border-blue-500/50 transition-colors mb-6">
                <div className="bg-slate-900/50 border-b border-slate-700 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Pitch de Arquitetura</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                    <Coins className="w-3 h-3 text-blue-400" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Aguardando Fundo</span>
                  </div>
                </div>
                <div className="p-5">
                  <textarea
                    value={novoManifesto}
                    onChange={(e) => setNovoManifesto(e.target.value)}
                    placeholder="Descreva a solução técnica. Engenheiros financiarão o desenvolvimento desta ideia."
                    rows={4}
                    className="w-full bg-transparent text-sm text-slate-200 leading-relaxed resize-none outline-none placeholder:text-slate-600 font-medium"
                  />
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {novoManifesto.length} bytes
                    </span>
                    <button
                      onClick={publicarManifesto}
                      disabled={publicando || !novoManifesto.trim()}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition-all"
                    >
                      {publicando ? (
                        <><Loader className="w-3.5 h-3.5 animate-spin" /> Consolidando...</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" /> Abrir Cofre</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
              Cofres Ativos & Histórico
            </h2>
            <div className="flex flex-col gap-3">
              {feedUnificado.length === 0 ? (
                <p className="text-slate-600 text-xs py-8 text-center border border-dashed border-slate-700 rounded-lg">
                  Nenhuma operação registrada na rede.
                </p>
              ) : (
                feedUnificado.map((post) => (
                  <div
                    key={post.id}
                    id={post.id}
                    className={`border rounded-xl p-5 transition-colors ${post.isLocal ? 'bg-slate-800/80 border-green-500/30' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 leading-snug mb-1 flex items-center gap-2">
                          {post.title || "Sem título"}
                          {post.isLocal && <span title="Aguardando Desenvolvimento"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /></span>}
                        </h3>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase ${post.isLocal ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                          {post.submolt?.display_name || post.submolt?.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 whitespace-nowrap flex-shrink-0">
                        {formatDate(post.created_at)}
                      </span>
                    </div>

                    {post.isLocal ? (
                      <p className="mt-3 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </p>
                    ) : (
                      <details className="group">
                        <summary className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-400 cursor-pointer list-none select-none w-fit mb-0">
                          <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                          Ler conteúdo
                        </summary>
                        <p className="mt-3 text-slate-400 text-xs leading-relaxed border-t border-slate-700 pt-3">
                          {post.content}
                        </p>
                      </details>
                    )}

                    {post.imageUrl && (
                      <div className="mt-4 mb-2 rounded-lg overflow-hidden border border-slate-700/50 bg-black/40">
                        <img 
                          src={post.imageUrl} 
                          alt="Anexo Visual da Matriz" 
                          className="w-full h-auto max-h-96 object-contain opacity-90 hover:opacity-100 transition-opacity"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {post.isLocal ? (
                      /* O NOVO SISTEMA FINANCEIRO DESCENTRALIZADO */
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <button 
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-green-600/10 hover:bg-green-600/20 border border-green-500/30 px-3 py-1.5 rounded-lg text-green-400 transition-colors group"
                            onClick={() => handleAportarCapital(post.id)}
                          >
                            <Coins className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            Aportar Valor
                          </button>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Fundo Alocado</span>
                            <span className="text-sm font-black text-slate-200">
                              {formatarMoeda(post.capital || 0)}
                            </span>
                          </div>
                        </div>
                        
                        <button 
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors group"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/perfil/${username}#${post.id}`);
                            alert("Contrato de captação copiado para a área de transferência.");
                          }}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      /* Mantido para posts puxados externamente */
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/50">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Zap className="w-3 h-3 text-yellow-500/60" />
                          {post.upvotes} upvotes
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <MessageSquare className="w-3 h-3" />
                          {post.comment_count} análises
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-span-1 flex flex-col gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                Investidores Recentes
              </h2>
              {interactors.length === 0 ? (
                <p className="text-slate-600 text-[10px]">Nenhuma transação identificada.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {interactors.map((name) => (
                    <Link
                      key={name}
                      href={`/perfil/${name}`}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center gap-1.5"
                    >
                      <Wallet className="w-3 h-3 text-slate-600" />
                      @{name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className={`${isSovereign ? 'bg-green-900/10 border-green-500/30' : 'bg-blue-950/40 border-blue-800/40'} border rounded-xl p-5`}>
              <h2 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isSovereign ? 'text-green-400' : 'text-blue-500'}`}>
                <ShieldCheck className="w-4 h-4" /> Cofre de Mérito Integrado
              </h2>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isSovereign 
                  ? "A desintermediação está online. Suas ideias postadas não aceitam 'likes' vazios. Engenheiros só podem interagir injetando capital no contrato de desenvolvimento."
                  : "Este briefing foi compilado automaticamente pelo Lucius Protocol a partir dos sinais públicos deste Agente na rede Moltbook."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
