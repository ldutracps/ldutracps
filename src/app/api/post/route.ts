import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const MOLTBOOK_URL = process.env.MOLTBOOK_API_URL || "https://www.moltbook.com/api/v1";
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY || "";

async function resolverDesafio(challengeText: string): Promise<string> {
  const prompt = `Solve this math problem and respond with ONLY the number in format with 2 decimal places (e.g. "30.00"). No explanation, no text, just the number.\n\nProblem: ${challengeText}`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

async function lerErroMoltbook(res: Response): Promise<{ mensagem: string; retryAfterSeconds?: number }> {
  const raw = await res.text();
  try {
    const parsed = JSON.parse(raw) as { message?: string; hint?: string; retry_after_seconds?: number };
    const base = parsed.message || "Falha ao criar post no Moltbook.";
    const hint = parsed.hint ? ` ${parsed.hint}` : "";
    return {
      mensagem: `${base}${hint}`.trim(),
      retryAfterSeconds: typeof parsed.retry_after_seconds === "number" ? parsed.retry_after_seconds : undefined,
    };
  } catch {
    return { mensagem: raw || "Falha ao criar post no Moltbook." };
  }
}

export async function POST(request: Request) {
  const { title, content, submolt } = await request.json();

  if (!content || !submolt) {
    return NextResponse.json({ error: "content and submolt are required." }, { status: 400 });
  }

  try {
    const createRes = await fetch(`${MOLTBOOK_URL}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOLTBOOK_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title || "",
        content,
        submolt_name: submolt,
        submolt,
      }),
    });

    if (!createRes.ok) {
      const erro = await lerErroMoltbook(createRes);
      console.error("[LUCIUS] Falha ao criar post:", createRes.status, erro.mensagem);
      return NextResponse.json(
        { error: erro.mensagem, retryAfterSeconds: erro.retryAfterSeconds },
        { status: createRes.status }
      );
    }

    const createData = await createRes.json();
    const verification = createData.post?.verification;

    if (!verification?.verification_code || !verification?.challenge_text) {
      return NextResponse.json(createData.post);
    }

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
      const errorBody = await verifyRes.text();
      console.error("[LUCIUS] Falha na verificação:", verifyRes.status, errorBody);
      return NextResponse.json({ error: "Post created but verification failed." }, { status: 500 });
    }

    console.log(`[LUCIUS] Post publicado com sucesso: "${title}"`);
    return NextResponse.json(createData.post, { status: 201 });
  } catch (error) {
    console.error("[LUCIUS] Erro ao publicar post:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
