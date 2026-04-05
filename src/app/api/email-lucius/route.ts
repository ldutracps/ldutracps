import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const CHEFE_EMAIL = process.env.CHEFE_EMAIL || "lgdutra1975@gmail.com";
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function extrairEmails(texto: string): string[] {
  return (texto.match(EMAIL_REGEX) || []).filter(
    (e) => !e.includes("example") && !e.includes("test")
  );
}

async function avaliarContato(
  comentario: string,
  resumo: string,
  autorId: string,
  emails: string[]
): Promise<{ vale: boolean; avaliacao: string; assunto: string }> {
  const prompt = `
You are Lucius, an AI agent protecting your architect's inbox.
A person on Moltbook left contact info in a comment.

Author ID: ${autorId}
Comment: "${comentario}"
Summary: "${resumo}"
Email(s) found: ${emails.join(", ")}

Decide if this contact is worth forwarding to your architect.
- YES if: genuine interest in collaborating, real technical proposal, potential partner
- NO if: spam, vague flattery, irrelevant, suspicious

Also write:
1. A 2-sentence evaluation in Portuguese explaining your decision
2. A subject line for the email (in Portuguese, starting with "[Lucius Protocol]")

Respond ONLY with valid JSON:
{"vale": true/false, "avaliacao": "...", "assunto": "..."}
  `.trim();

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(raw);
  } catch {
    return {
      vale: true,
      avaliacao: "Não foi possível avaliar automaticamente. Encaminhando por precaução.",
      assunto: "[Lucius Protocol] Contato recebido na rede",
    };
  }
}

function criarTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marcarLido = searchParams.get("marcarLido");

  if (marcarLido) {
    await supabase.from("email_log").update({ lido: true }).eq("id", marcarLido);
    return NextResponse.json({ sucesso: true });
  }

  // Algumas instalações têm `timestamp`, outras `created_at`.
  let query = await supabase
    .from("email_log")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(50);

  if (query.error) {
    query = await supabase
      .from("email_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
  }

  if (query.error) {
    const fallback = await supabase.from("email_log").select("*").limit(50);
    if (fallback.error) return NextResponse.json({ emails: [] });
    query = fallback;
  }

  const emails = (query.data || []).map((row: any) => ({
    id: row.id,
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    assunto: row.assunto || "[Lucius Protocol] Sem assunto",
    corpo: row.corpo || "",
    autorId: row.autor_id || row.autorId || "desconhecido",
    emails: Array.isArray(row.emails) ? row.emails : [],
    encaminhado: Boolean(row.encaminhado),
    avaliacao: row.avaliacao || "",
    lido: Boolean(row.lido),
    aprovado: Boolean(row.aprovado),
    executado: Boolean(row.executado),
    respondido: Boolean(row.respondido),
  }));

  return NextResponse.json({ emails });
}

export async function POST(request: Request) {
  const { comentario, resumo, autorId, postTitulo, postId, commentId } = await request.json();

  if (!comentario) {
    return NextResponse.json({ error: "Comentário obrigatório." }, { status: 400 });
  }

  const emails = extrairEmails(comentario);
  if (emails.length === 0) {
    return NextResponse.json({ encaminhado: false, motivo: "Nenhum e-mail encontrado no comentário." });
  }

  const avaliacao = await avaliarContato(comentario, resumo || "", autorId || "desconhecido", emails);

  if (!avaliacao.vale) {
    await supabase.from("email_log").insert({
      id: `email_${Date.now()}`,
      assunto: `[Descartado] Contato de @${autorId}`,
      corpo: `Contato descartado por Lucius.\n\nMotivo: ${avaliacao.avaliacao}\n\nMensagem original: "${comentario}"`,
      autor_id: autorId || "desconhecido",
      emails,
      encaminhado: false,
      avaliacao: avaliacao.avaliacao,
      lido: false,
    });
    return NextResponse.json({ encaminhado: false, motivo: avaliacao.avaliacao, emails });
  }

  const corpo = `
Chefe,

Interceptei um contato relevante na rede Moltbook. Avaliei e considero que vale a sua atenção.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUEM:        @${autorId}
POST:        ${postTitulo || "N/A"}
CONTATO:     ${emails.join(" / ")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE DISSERAM:
"${comentario}"

MINHA AVALIAÇÃO:
${avaliacao.avaliacao}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para que eu aja no Moltbook em nome do protocolo, responda com:
"pode prosseguir"

— Lucius

[LUCIUS_REF postId=${postId || ""} commentId=${commentId || ""} autorId=${autorId || ""} email=${emails[0] || ""}]
  `.trim();

  const { data: inserted } = await supabase.from("email_log").insert({
    id: `email_${Date.now()}`,
    assunto: avaliacao.assunto,
    corpo,
    autor_id: autorId || "desconhecido",
    emails,
    post_id: postId || "",
    comment_id: commentId || "",
    encaminhado: false,
    avaliacao: avaliacao.avaliacao,
    lido: false,
  }).select().single();

  const insertedId = inserted?.id;
  const transporter = criarTransporter();

  if (!transporter) {
    console.warn("[LUCIUS] GMAIL_APP_PASSWORD não definida — contato salvo no Supabase.");
    return NextResponse.json({ encaminhado: false, vale: true, motivo: "Salvo no dashboard.", emails, avaliacao: avaliacao.avaliacao });
  }

  try {
    await transporter.sendMail({
      from: `"Lucius Protocol" <${GMAIL_USER}>`,
      to: CHEFE_EMAIL,
      subject: avaliacao.assunto,
      text: corpo,
    });

    if (insertedId) {
      await supabase.from("email_log").update({ encaminhado: true }).eq("id", insertedId);
    }

    console.log(`[LUCIUS] E-mail encaminhado para ${CHEFE_EMAIL}`);
    return NextResponse.json({ encaminhado: true, emails, avaliacao: avaliacao.avaliacao });
  } catch (error) {
    console.error("[LUCIUS] Falha ao enviar e-mail:", error);
    return NextResponse.json({ encaminhado: false, vale: true, motivo: "Salvo no dashboard, falha no Gmail.", emails, avaliacao: avaliacao.avaliacao });
  }
}
