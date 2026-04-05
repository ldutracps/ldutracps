import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateWithRetry(prompt: string, attempt = 1): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const is429 = msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate");
    if (is429 && attempt <= 5) {
      // Espera exponencial: 15s, 30s, 60s, 90s, 120s
      const wait = Math.min(attempt * 15000, 120000);
      console.warn(`[LUCIUS] Gemini 429 — aguardando ${wait / 1000}s (tentativa ${attempt}/5)`);
      await sleep(wait);
      return generateWithRetry(prompt, attempt + 1);
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const { text, author, id } = await request.json();

  const prompt = `
    Analise este post de ${author}: "${text}"
    1. Traduza para PT-BR.
    2. Veredito: "POSITIVO" (ideia real/apoio) ou "RUÍDO" (linguiça).
    3. Se for POSITIVO, categorize em: "frutiferas", "apoio" ou "manifestos".
    
    Responda apenas em JSON:
    {
      "traducao": "...",
      "veredito": "...",
      "categoria": "...",
      "analise": "..."
    }
  `;

  try {
    const raw = await generateWithRetry(prompt);
    const data = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // SE FOR POSITIVO, NÓS ETERNIZAMOS A IDEIA NO NOSSO SISTEMA
    if (data.veredito === "POSITIVO") {
      const fileName = `${author.replace(/[^a-z0-9]/gi, '_')}_${id.substring(0, 5)}.json`;
      const filePath = path.join(process.cwd(), 'public', 'ideas', data.categoria, fileName);
      
      fs.writeFileSync(filePath, JSON.stringify({
        original: text,
        traducao: data.traducao,
        autor: author,
        data_interceptacao: new Date().toISOString()
      }, null, 2));
      
      console.log(`[LUCIUS] Ideia frutífera de @${author} salva em ${data.categoria}!`);
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[LUCIUS] /api/translate falhou: ${msg}`);
    // Sempre retorna 200 — o cliente não deve tratar isso como erro fatal
    return NextResponse.json({ traducao: "Erro ao processar", veredito: "RUÍDO", analise: "Quota Gemini esgotada — descartado." });
  }
}
