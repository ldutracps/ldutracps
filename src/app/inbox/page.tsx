"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MailOpen, Loader, Radio, CheckCheck, ChevronDown, X, RefreshCw, Zap, Send, Bot } from "lucide-react";

interface EmailEntry {
  id: string;
  timestamp: string;
  assunto: string;
  corpo: string;
  autorId: string;
  emails: string[];
  encaminhado: boolean;
  avaliacao: string;
  lido: boolean;
  aprovado?: boolean;
  executado?: boolean;
  respondido?: boolean;
}

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

export default function InboxPage() {
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [ultimaVerificacao, setUltimaVerificacao] = useState<Date | null>(null);
  const [acoesExecutadas, setAcoesExecutadas] = useState<Array<{ assunto: string; acao: string; executado: boolean }>>([]);
  type ReplyStatus = "idle" | "gerando" | "enviado" | "rascunho" | "erro";
  const [replyStatus, setReplyStatus] = useState<Record<string, ReplyStatus>>({});
  const [replyTexto, setReplyTexto] = useState<Record<string, string>>({});
  const carregadoRef = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const naoLidos = emails.filter((e) => !e.lido && e.encaminhado).length;
  const relevantes = emails.filter((e) => e.encaminhado);
  const descartados = emails.filter((e) => !e.encaminhado);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/email-lucius");
      const data = await res.json();
      setEmails(data.emails || []);
    } catch {
      // silencioso
    } finally {
      setCarregando(false);
    }
  }

  async function verificarGmail() {
    if (verificando) return;
    setVerificando(true);
    try {
      const res = await fetch("/api/check-inbox");
      const data = await res.json();
      setUltimaVerificacao(new Date());
      if (data.acoes && data.acoes.length > 0) {
        setAcoesExecutadas(data.acoes);
        await carregar(); // recarrega log com aprovações
      }
    } catch {
      // silencioso
    } finally {
      setVerificando(false);
    }
  }

  async function marcarLido(id: string) {
    setEmails((prev) => prev.map((e) => e.id === id ? { ...e, lido: true } : e));
    await fetch(`/api/email-lucius?marcarLido=${id}`).catch(() => {});
  }

  async function abrirEmail(entry: EmailEntry) {
    setAberto(aberto === entry.id ? null : entry.id);
    if (!entry.lido && entry.encaminhado) {
      await marcarLido(entry.id);
    }
  }

  async function luciusResponder(entry: EmailEntry) {
    setReplyStatus((prev) => ({ ...prev, [entry.id]: "gerando" }));
    try {
      const res = await fetch("/api/reply-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: entry.id,
          paraEmail: entry.emails[0],
          autorId: entry.autorId,
          corpoOriginal: entry.corpo,
          assuntoOriginal: entry.assunto,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReplyTexto((prev) => ({ ...prev, [entry.id]: data.rascunho }));
      setReplyStatus((prev) => ({
        ...prev,
        [entry.id]: data.enviado ? "enviado" : "rascunho",
      }));
      setEmails((prev) => prev.map((e) => e.id === entry.id ? { ...e, respondido: true } : e));
    } catch {
      setReplyStatus((prev) => ({ ...prev, [entry.id]: "erro" }));
    }
  }

  async function marcarTodosLidos() {
    const pendentes = emails.filter((e) => !e.lido && e.encaminhado);
    for (const e of pendentes) await marcarLido(e.id);
  }

  useEffect(() => {
    if (carregadoRef.current) return;
    carregadoRef.current = true;
    carregar();
    verificarGmail(); // verifica ao entrar

    // Polling a cada 3 minutos
    pollingRef.current = setInterval(verificarGmail, 3 * 60 * 1000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-[Inter,sans-serif]">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Dashboard
          </Link>
          <div className="flex items-center gap-3">
            {naoLidos > 0 && (
              <button onClick={marcarTodosLidos} className="flex items-center gap-1.5 text-[9px] text-slate-500 hover:text-slate-300 transition-colors font-bold uppercase tracking-wide">
                <CheckCheck className="w-3 h-3" />
                Marcar lidos
              </button>
            )}
            <button
              onClick={verificarGmail}
              disabled={verificando}
              className="flex items-center gap-1.5 text-[9px] text-slate-600 hover:text-blue-400 transition-colors font-mono disabled:opacity-50"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${verificando ? "animate-spin" : ""}`} />
              {verificando ? "Verificando..." : ultimaVerificacao ? `verificado ${tempoRelativo(ultimaVerificacao.toISOString())}` : "Verificar Gmail"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-3 md:p-6">

        {/* Título */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black italic tracking-tighter">INBOX</h1>
            {naoLidos > 0 && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {naoLidos} novo{naoLidos > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs">
            Somente contatos filtrados e avaliados pelo Lucius Protocol.
          </p>
        </div>

        {/* Banner de ações executadas */}
        {acoesExecutadas.length > 0 && (
          <div className="mb-6 rounded-xl border border-green-500/40 bg-green-900/15 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-green-400" />
              <p className="text-xs font-black text-green-300 uppercase tracking-widest">
                Lucius executou {acoesExecutadas.length} ação{acoesExecutadas.length > 1 ? "ões" : ""}
              </p>
            </div>
            {acoesExecutadas.map((a, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <p className="text-[10px] text-slate-500 truncate">{a.assunto}</p>
                <p className="text-xs text-green-200/80 leading-relaxed italic">"{a.acao}"</p>
              </div>
            ))}
            <button onClick={() => setAcoesExecutadas([])} className="mt-3 text-[9px] text-slate-600 hover:text-slate-400 transition-colors">
              dispensar
            </button>
          </div>
        )}

        {carregando ? (
          <div className="flex flex-col items-center py-24 gap-4">
            <Loader className="w-5 h-5 text-blue-400 animate-spin" />
            <p className="text-blue-400 text-xs font-mono animate-pulse">Carregando mensagens...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <Mail className="w-10 h-10 text-slate-700" />
            <p className="text-slate-600 text-xs uppercase font-bold tracking-widest">Nenhuma mensagem ainda</p>
            <p className="text-slate-700 text-[10px]">Lucius encaminhará contatos relevantes da rede aqui.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Mensagens relevantes */}
            {relevantes.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  Encaminhados por Lucius ({relevantes.length})
                </p>
                <div className="flex flex-col gap-2">
                  {relevantes.map((entry) => (
                    <div key={entry.id} className={`rounded-xl border transition-all ${
                      !entry.lido
                        ? "border-blue-500/40 bg-blue-900/10"
                        : "border-slate-700 bg-slate-800/40"
                    }`}>
                      {/* Cabeçalho do e-mail */}
                      <button
                        onClick={() => abrirEmail(entry)}
                        className="w-full flex items-start gap-3 p-4 text-left"
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {!entry.lido
                            ? <Mail className="w-4 h-4 text-blue-400" />
                            : <MailOpen className="w-4 h-4 text-slate-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className={`text-xs font-bold truncate ${!entry.lido ? "text-slate-100" : "text-slate-400"}`}>
                              {entry.assunto}
                            </p>
                            {entry.aprovado && (
                              <span className="flex-shrink-0 text-[9px] font-black text-green-400 bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 rounded-full">
                                ✓ aprovado
                              </span>
                            )}
                          </div>
                            <span className="text-[9px] text-slate-600 font-mono flex-shrink-0">
                              {tempoRelativo(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            @{entry.autorId} · {entry.emails.join(", ")}
                          </p>
                          <p className="text-[10px] text-slate-600 truncate mt-0.5 italic">
                            {entry.avaliacao}
                          </p>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5 transition-transform ${aberto === entry.id ? "rotate-180" : ""}`} />
                      </button>

                      {/* Corpo expandido */}
                      {aberto === entry.id && (
                        <div className="px-4 pb-4 border-t border-slate-700/50">
                          <pre className="mt-4 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-[Inter,sans-serif]">
                            {entry.corpo}
                          </pre>
                          {/* Ações */}
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <a
                              href={`mailto:${entry.emails[0]}`}
                              className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 border border-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-700 transition-all uppercase tracking-wide"
                            >
                              <Mail className="w-3 h-3" />
                              Você responder
                            </a>

                            {/* Lucius Responder */}
                            {(() => {
                              const st = replyStatus[entry.id] || "idle";
                              if (entry.respondido && st === "idle") {
                                return (
                                  <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold">
                                    <Bot className="w-3 h-3" /> Lucius já respondeu
                                  </span>
                                );
                              }
                              if (st === "idle") return (
                                <button
                                  onClick={() => luciusResponder(entry)}
                                  className="flex items-center gap-1.5 text-[10px] font-black text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-full hover:bg-blue-500/10 transition-all uppercase tracking-wide"
                                >
                                  <Bot className="w-3 h-3" />
                                  Lucius Responder
                                </button>
                              );
                              if (st === "gerando") return (
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <Loader className="w-3 h-3 animate-spin" />
                                  Lucius redigindo...
                                </div>
                              );
                              if (st === "enviado") return (
                                <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold">
                                  <Send className="w-3 h-3" /> Enviado por e-mail
                                </span>
                              );
                              if (st === "rascunho") return (
                                <span className="flex items-center gap-1.5 text-[10px] text-yellow-400 font-bold">
                                  <Bot className="w-3 h-3" /> Rascunho gerado (sem Gmail)
                                </span>
                              );
                              return (
                                <button onClick={() => luciusResponder(entry)} className="text-[10px] text-red-400 underline">
                                  Falha — tentar de novo
                                </button>
                              );
                            })()}
                          </div>

                          {/* Preview da resposta do Lucius */}
                          {replyTexto[entry.id] && (
                            <div className="mt-4 rounded-lg bg-blue-900/20 border border-blue-500/20 px-4 py-3">
                              <p className="text-[9px] text-blue-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                                <Bot className="w-3 h-3" /> Resposta do Lucius:
                              </p>
                              <pre className="text-xs text-blue-100/80 leading-relaxed whitespace-pre-wrap font-[Inter,sans-serif]">
                                {replyTexto[entry.id]}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagens descartadas */}
            {descartados.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-3">
                  Descartados por Lucius ({descartados.length})
                </p>
                <div className="flex flex-col gap-2">
                  {descartados.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/30 opacity-50">
                      <button
                        onClick={() => setAberto(aberto === entry.id ? null : entry.id)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <X className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-600 truncate">{entry.assunto}</p>
                          <p className="text-[9px] text-slate-700 truncate italic">{entry.avaliacao}</p>
                        </div>
                        <span className="text-[9px] text-slate-700 font-mono flex-shrink-0">
                          {tempoRelativo(entry.timestamp)}
                        </span>
                      </button>
                      {aberto === entry.id && (
                        <div className="px-4 pb-3 border-t border-slate-800">
                          <p className="mt-3 text-[10px] text-slate-600 leading-relaxed italic">
                            Motivo do descarte: {entry.avaliacao}
                          </p>
                          {entry.emails.length > 0 && (
                            <p className="text-[10px] text-slate-700 mt-1">Contato: {entry.emails.join(", ")}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
