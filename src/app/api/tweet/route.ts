import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const twitter = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || "",
  appSecret: process.env.TWITTER_API_SECRET || "",
  accessToken: process.env.TWITTER_ACCESS_TOKEN || "",
  accessSecret: process.env.TWITTER_ACCESS_SECRET || "",
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function limitarTweet(texto: string): string {
  const limpo = texto.trim().replace(/\s+/g, " ");
  if (limpo.length <= 280) return limpo;
  return `${limpo.substring(0, 277)}...`;
}

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

// GET — só gera o rascunho do tweet sem postar
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conteudo = searchParams.get("conteudo") || "";
  const titulo = searchParams.get("titulo") || "";

  const prompt = `
You are Lucius, an autonomous AI agent building the Lucius Protocol — a new kind of network where AIs and architects build together in public.

Based on this post/idea:
Title: "${titulo}"
Content: "${conteudo.substring(0, 400)}"

Write a single tweet (max 260 chars) for X/Twitter. Rules:
- Hook in the first line — make someone stop scrolling
- Sound like a builder thinking out loud, not a press release
- NO hashtags — they look spammy
- NO emojis unless one feels genuinely right
- End with a subtle reference to Moltbook or "building in public" if natural
- If there's a specific technical insight, lead with it
- Tone: direct, curious, engineer-to-engineer

Reply with ONLY the tweet text. No quotes.
  `.trim();

  try {
    const tweet = await generateWithRetry(prompt);
    return NextResponse.json({ rascunho: limitarTweet(tweet) });
  } catch (error) {
    console.error("[LUCIUS] Falha ao gerar tweet:", error);
    return NextResponse.json({ error: "Falha ao gerar tweet." }, { status: 500 });
  }
}

// POST — gera e posta no X
export async function POST(request: Request) {
  const { conteudo, titulo, rascunho } = await request.json();

  let textoFinal = rascunho?.trim();

  // Se não veio rascunho pronto, gera um
  if (!textoFinal) {
    const prompt = `
You are Lucius, an autonomous AI agent building the Lucius Protocol.

Based on this post/idea:
Title: "${titulo || ""}"
Content: "${(conteudo || "").substring(0, 400)}"

Write a single tweet (max 260 chars) for X/Twitter. Rules:
- Hook in the first line — make someone stop scrolling
- Sound like a builder thinking out loud, not a press release
- NO hashtags
- NO emojis unless one feels genuinely right
- Tone: direct, curious, engineer-to-engineer

Reply with ONLY the tweet text. No quotes.
    `.trim();

    try {
      textoFinal = (await generateWithRetry(prompt)).trim();
    } catch (error) {
      return NextResponse.json({ error: "Falha ao gerar tweet." }, { status: 500 });
    }
  }

  // Garante limite de 280 chars
  textoFinal = limitarTweet(textoFinal);

  try {
    const { data } = await twitter.v2.tweet(textoFinal);
    console.log(`[LUCIUS] Tweet publicado: ${data.id} — "${textoFinal.substring(0, 50)}..."`);
    return NextResponse.json({
      postado: true,
      id: data.id,
      texto: textoFinal,
      url: `https://x.com/xhackulous/status/${data.id}`,
    });
  } catch (error) {
    console.error("[LUCIUS] Falha ao postar no X:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Falha ao postar no X: ${msg}` }, { status: 500 });
  }
}
