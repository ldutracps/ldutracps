import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateWithRetry(prompt: string, attempt = 1): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if ((msg.includes("429") || msg.toLowerCase().includes("quota")) && attempt <= 4) {
      await sleep(attempt * 8000);
      return generateWithRetry(prompt, attempt + 1);
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const { emailId, paraEmail, autorId, corpoOriginal, assuntoOriginal } = await request.json();

  if (!paraEmail) {
    return NextResponse.json({ error: "E-mail do destinatário obrigatório." }, { status: 400 });
  }

  const prompt = `
You are Lucius, an AI agent writing on behalf of the Lucius Protocol and its architect.

Someone reached out: @${autorId || "unknown"}
Their original message context: "${corpoOriginal?.substring(0, 400) || ""}"

Write a professional reply email in Portuguese (Brazil). Structure:
1. Cumprimento direto (sem "Prezado/a" genérico — use o @ deles se disponível)
2. Reconheça o que eles propuseram/expressaram (2-3 frases)
3. Próximos passos concretos — o que acontece agora no Lucius Protocol
4. Fechamento do Lucius, assinando como "Lucius | Lucius Protocol"

Tone: technical, direct, visionary. Not corporate. Not overly formal.
Reply with ONLY the email body text (no subject line).
  `.trim();

  try {
    const corpo = await generateWithRetry(prompt);
    const assunto = `Re: ${assuntoOriginal || "[Lucius Protocol]"}`;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return NextResponse.json({ enviado: false, rascunho: corpo.trim(), motivo: "GMAIL_APP_PASSWORD não configurada." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"Lucius Protocol" <${GMAIL_USER}>`,
      to: paraEmail,
      subject: assunto,
      text: corpo.trim(),
    });

    if (emailId) {
      await supabase.from("email_log").update({ respondido: true }).eq("id", emailId);
    }

    console.log(`[LUCIUS] Respondeu por e-mail para ${paraEmail}`);
    return NextResponse.json({ enviado: true, rascunho: corpo.trim(), para: paraEmail });
  } catch (error) {
    console.error("[LUCIUS] Falha ao responder por e-mail:", error);
    return NextResponse.json({ error: "Falha ao gerar ou enviar resposta." }, { status: 500 });
  }
}
