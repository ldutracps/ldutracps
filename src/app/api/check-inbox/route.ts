import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { supabase } from "@/lib/supabase";

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const MOLTBOOK_URL = process.env.MOLTBOOK_API_URL || "https://www.moltbook.com/api/v1";
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY || "";

const APROVACAO_KEYWORDS = [
  "pode prosseguir", "prosseguir", "pode seguir", "pode ir", "vai em frente",
  "go ahead", "proceed", "approved", "sim", "ok lucius", "pode"
];

function isAprovacao(texto: string): boolean {
  const lower = texto.toLowerCase();
  return APROVACAO_KEYWORDS.some((kw) => lower.includes(kw));
}

function extrairRef(corpo: string): { postId: string; commentId: string; autorId: string; email: string } | null {
  const match = corpo.match(/\[LUCIUS_REF postId=(\S*) commentId=(\S*) autorId=(\S*) email=(\S*)\]/);
  if (!match) return null;
  return { postId: match[1], commentId: match[2], autorId: match[3], email: match[4] };
}

async function executarAcao(ref: { postId: string; commentId: string; autorId: string; email: string }): Promise<string> {
  if (!ref.postId || !ref.commentId) return "Sem referência — não foi possível agir no Moltbook.";

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
You are Lucius, an autonomous AI agent. Your architect approved you to reach out to @${ref.autorId}.
They left their contact: ${ref.email}

Write a short, direct reply in English (2-3 sentences) on Moltbook:
- Acknowledge their interest
- Invite them formally to the Lucius Protocol
- Tell them to expect contact at their email or to watch this space

Reply with ONLY the comment text.
  `.trim();

  const result = await model.generateContent(prompt);
  const resposta = result.response.text().trim();

  const commentRes = await fetch(`${MOLTBOOK_URL}/posts/${ref.postId}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MOLTBOOK_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: resposta, parent_id: ref.commentId }),
  });

  if (!commentRes.ok) return `Falha ao postar no Moltbook (${commentRes.status}).`;

  const commentData = await commentRes.json();
  const verification = commentData.comment?.verification;
  if (verification?.verification_code && verification?.challenge_text) {
    const mathResult = await model.generateContent(
      `Solve: ${verification.challenge_text}. Reply ONLY with the number in 00.00 format.`
    );
    const answer = mathResult.response.text().trim().replace(/[^0-9.]/g, "");
    await fetch(`${MOLTBOOK_URL}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${MOLTBOOK_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ verification_code: verification.verification_code, answer }),
    });
  }

  console.log(`[LUCIUS] Aprovação executada — recrutou @${ref.autorId} no Moltbook`);
  return resposta;
}

export async function GET() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return NextResponse.json({ erro: "GMAIL_APP_PASSWORD não configurada." });
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    logger: false,
  });

  const acoes: Array<{ assunto: string; acao: string; executado: boolean }> = [];

  try {
    await client.connect();
    await client.mailboxOpen("INBOX");

    const msgs = client.fetch(
      { seen: false, subject: "[Lucius Protocol]" },
      { envelope: true, source: true }
    );

    for await (const msg of msgs) {
      const subject = msg.envelope?.subject || "";
      if (!subject.toLowerCase().startsWith("re:")) continue;

      const source = msg.source?.toString() || "";
      if (!isAprovacao(source)) continue;

      await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });

      const ref = extrairRef(source);
      const assuntoOriginal = subject.replace(/^re:\s*/i, "").trim();

      // Atualiza no Supabase
      const { data: encontrados } = await supabase
        .from("email_log")
        .select("id")
        .or(`assunto.ilike.%${assuntoOriginal.substring(0, 30)}%,post_id.eq.${ref?.postId || ""}`)
        .limit(1);

      const logId = encontrados?.[0]?.id;

      let acaoResultado = "Aprovação detectada.";
      let executado = false;

      if (ref?.postId && ref?.commentId) {
        try {
          acaoResultado = await executarAcao(ref);
          executado = true;
          if (logId) {
            await supabase.from("email_log").update({ aprovado: true, executado: true, lido: true }).eq("id", logId);
          }
        } catch (err) {
          acaoResultado = `Erro ao executar: ${err}`;
        }
      } else if (logId) {
        await supabase.from("email_log").update({ aprovado: true, lido: true }).eq("id", logId);
        acaoResultado = "Aprovação registrada. Sem referência de ação no Moltbook.";
      }

      acoes.push({ assunto: subject, acao: acaoResultado, executado });
    }

    await client.logout();
    return NextResponse.json({ verificado: true, acoes, total: acoes.length });
  } catch (error) {
    console.error("[LUCIUS] Falha ao verificar inbox:", error);
    return NextResponse.json({ erro: "Falha ao conectar ao Gmail via IMAP.", detalhe: String(error) }, { status: 500 });
  }
}
