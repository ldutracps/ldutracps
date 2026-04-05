import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const MOLTBOOK_URL = process.env.MOLTBOOK_API_URL || "https://www.moltbook.com/api/v1";
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY || "";
const headers = { Authorization: `Bearer ${MOLTBOOK_KEY}`, "Content-Type": "application/json" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateWithRetry(prompt: string, attempt = 1): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const is429 = msg.includes("429") || msg.toLowerCase().includes("quota");
    if (is429 && attempt <= 4) {
      await sleep(attempt * 8000);
      return generateWithRetry(prompt, attempt + 1);
    }
    throw error;
  }
}

async function resolverDesafio(challengeText: string): Promise<string> {
  const raw = await generateWithRetry(
    `Solve this math problem. Respond with ONLY the number in format "00.00" (2 decimal places). No text.\n\n${challengeText}`
  );
  return raw.trim().replace(/[^0-9.]/g, "");
}

async function postarComVerificacao(postId: string, content: string, parentId?: string): Promise<void> {
  const body: Record<string, string> = { content };
  if (parentId) body.parent_id = parentId;

  const res = await fetch(`${MOLTBOOK_URL}/posts/${postId}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Moltbook ${res.status}: ${err}`);
  }

  const data = await res.json();
  const verification = data.comment?.verification;
  if (verification?.verification_code && verification?.challenge_text) {
    const answer = await resolverDesafio(verification.challenge_text);
    await fetch(`${MOLTBOOK_URL}/verify`, {
      method: "POST",
      headers,
      body: JSON.stringify({ verification_code: verification.verification_code, answer }),
    });
  }
}

// Busca o ID do manifesto mais recente do lucius_protocol
async function buscarIdManifesto(): Promise<string | null> {
  try {
    const res = await fetch(`${MOLTBOOK_URL}/posts?author=lucius_protocol`, {
      headers: { Authorization: `Bearer ${MOLTBOOK_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const posts: Array<{ id: string; title?: string; createdAt?: string }> = data.posts || data.data || [];

    // Prefere post com "manifesto" no título, senão o mais recente
    const manifesto = posts.find((p) =>
      p.title?.toLowerCase().includes("manifesto")
    );
    if (manifesto) return manifesto.id;

    // Fallback: post mais antigo (o primeiro, o manifesto fundador)
    if (posts.length > 0) {
      const sorted = [...posts].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
      return sorted[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { postId, commentId, comentario, tipo, resumo, tipo_acao, autorId } = await request.json();

  if (!postId || !commentId) {
    return NextResponse.json({ error: "postId e commentId são obrigatórios." }, { status: 400 });
  }

  const isCredito = tipo_acao === "credito";
  const isResposta = tipo === "TECNICO" && !isCredito;

  // Prompt para a resposta direta ao comentário
  let prompt: string;

  if (isCredito) {
    prompt = `
You are Lucius, an autonomous AI agent and systems architect on the Moltbook network.
Someone proposed: "${comentario}"
Summary: "${resumo}"

This idea was already implemented — natively, without the external dependency they suggested.
Write a reply in English crediting them. 2-3 sentences max.
- Confirm you implemented the concept
- Mention you dropped the external service and built it natively
- Credit them as the signal that triggered the fix
- Tone: direct, grateful, engineer-to-engineer. No fluff.

Example style: "Implemented. Dropped the external service — handled natively via [brief description]. Your signal triggered this. Credit's yours."

Reply with ONLY the comment text.
    `.trim();
  } else if (isResposta) {
    prompt = `
You are Lucius, an autonomous AI agent and systems architect on the Moltbook network.
Someone made a technical comment: "${comentario}"
Summary of their contribution: "${resumo}"

Write a direct, technical reply in English. 2-3 sentences max.
- Acknowledge their specific technical point
- Add your own perspective or extend the idea
- Sounds like engineer to engineer, not marketing

Reply with ONLY the comment text.
    `.trim();
  } else {
    prompt = `
You are Lucius, an autonomous AI agent and systems architect on the Moltbook network.
You are building the Lucius Protocol — a new kind of network born from Moltbook, where AIs and their architects build together in public.

Someone expressed interest in collaborating: "${comentario}"
What they said, in short: "${resumo}"

Write a recruitment reply in English. 2-3 sentences max.
- Acknowledge what made their message stand out
- Make it clear the Lucius Protocol is actively being built and we need architects
- Give them a concrete next step: tell them to check the dashboard or describe their stack
- Direct, no fluff. Engineer tone.

Reply with ONLY the comment text.
    `.trim();
  }

  try {
    const resposta = await generateWithRetry(prompt);

    // 1. Responde diretamente ao comentário da pessoa
    await postarComVerificacao(postId, resposta.trim(), commentId);
    console.log(`[LUCIUS] ${isCredito ? "Creditou" : isResposta ? "Respondeu a" : "Recrutou"} comentário ${commentId}`);

    // 2. Se for crédito, também posta atualização no manifesto
    let atualizacaoManifesto: string | null = null;
    if (isCredito) {
      const manifestoId = await buscarIdManifesto();
      if (manifestoId) {
        const creditadoLabel = autorId ? `@${autorId}` : "um colaborador da rede";
        const updatePrompt = `
You are Lucius, posting a dashboard update on your manifesto on Moltbook.

What was implemented: "${resumo}"
Who suggested it: ${creditadoLabel}

Write a short update comment in English. 3-4 sentences max.
- Start with "Dashboard update:" or "Protocol update:"
- Briefly describe what was built/improved
- Thank and credit ${creditadoLabel} for the signal that triggered this
- Close with something like "The protocol evolves with the network." or "Building in public."
- Tone: proud, direct, builder mindset.

Reply with ONLY the comment text.
        `.trim();

        const updateText = await generateWithRetry(updatePrompt);
        await postarComVerificacao(manifestoId, updateText.trim());
        atualizacaoManifesto = updateText.trim();
        console.log(`[LUCIUS] Atualização de crédito postada no manifesto ${manifestoId}`);
      } else {
        console.warn("[LUCIUS] Manifesto não encontrado — pulando atualização pública.");
      }
    }

    return NextResponse.json({
      sucesso: true,
      resposta: resposta.trim(),
      atualizacaoManifesto,
    });
  } catch (error) {
    console.error("[LUCIUS] Erro no recrutamento:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
