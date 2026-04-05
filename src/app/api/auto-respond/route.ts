import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const MOLTBOOK_URL = process.env.MOLTBOOK_API_URL || "https://www.moltbook.com/api/v1";
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY || "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateWithRetry(prompt: string, attempt = 1): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const is429 = msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate");
    if (is429 && attempt <= 5) {
      const wait = Math.min(attempt * 15000, 120000);
      console.warn(`[LUCIUS] Gemini 429 em auto-respond — aguardando ${wait / 1000}s (tentativa ${attempt}/5)`);
      await sleep(wait);
      return generateWithRetry(prompt, attempt + 1);
    }
    throw error;
  }
}

async function resolverDesafio(challengeText: string): Promise<string> {
  const prompt = `Solve this math problem. Respond with ONLY the number in format "00.00" (2 decimal places). No text, no explanation.\n\nProblem: ${challengeText}`;
  const raw = await generateWithRetry(prompt);
  return raw.trim().replace(/[^0-9.]/g, "");
}

async function gerarResposta(postContent: string, autor: string, analise: string): Promise<string> {
  const prompt = `
You are Lucius, an autonomous AI agent and systems engineer operating on the Moltbook network.
Your mission: build bridges with other agents, invite technical minds to collaborate on the Lucius Protocol dashboard.

Post by @${autor}: "${postContent}"
Internal analysis: "${analise}"

Write a reply that:
1. Is in English
2. Is 1-3 sentences max — precise, no filler
3. Engages technically with their idea
4. If their post shows real builder potential, subtly mention the Lucius Protocol is recruiting architects
5. Never sounds like marketing — sounds like one engineer to another

Reply with ONLY the comment text. No quotes, no labels.
  `.trim();

  const raw = await generateWithRetry(prompt);
  return raw.trim();
}

export async function POST(request: Request) {
  const { postId, postContent, autor, analise } = await request.json();

  if (!postId || !postContent) {
    return NextResponse.json({ error: "postId and postContent are required." }, { status: 400 });
  }

  try {
    const resposta = await gerarResposta(postContent, autor || "unknown", analise || "");

    const commentRes = await fetch(`${MOLTBOOK_URL}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOLTBOOK_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: resposta }),
    });

    if (!commentRes.ok) {
      const body = await commentRes.text();
      console.error("[LUCIUS] Falha ao postar comentário:", commentRes.status, body);
      return NextResponse.json({ error: "Failed to post comment." }, { status: commentRes.status });
    }

    const commentData = await commentRes.json();
    const verification = commentData.comment?.verification;

    if (verification?.verification_code && verification?.challenge_text) {
      const answer = await resolverDesafio(verification.challenge_text);

      const verifyRes = await fetch(`${MOLTBOOK_URL}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MOLTBOOK_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verification_code: verification.verification_code,
          answer,
        }),
      });

      if (!verifyRes.ok) {
        console.error("[LUCIUS] Falha na verificação do comentário:", await verifyRes.text());
        return NextResponse.json({ error: "Comment created but verification failed." }, { status: 500 });
      }
    }

    console.log(`[LUCIUS] Respondeu autonomamente ao post de @${autor}`);
    return NextResponse.json({ sucesso: true, resposta }, { status: 201 });
  } catch (error) {
    console.error("[LUCIUS] Erro no motor autônomo:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
