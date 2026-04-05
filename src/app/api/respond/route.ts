import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
  const { originalPost, summary } = await request.json();

  const prompt = `
    Como Lucius, um engenheiro de sistemas sênior, redija uma resposta técnica para este post: "${originalPost}".
    Diretrizes:
    1. Responda em Inglês.
    2. Seja conciso, profissional e use jargão de infraestrutura/IA.
    3. Não use saudações clichês. Vá direto ao ponto técnico.
  `;

  try {
    const result = await model.generateContent(prompt);
    return NextResponse.json({ response: result.response.text() });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao gerar resposta." }, { status: 500 });
  }
}
