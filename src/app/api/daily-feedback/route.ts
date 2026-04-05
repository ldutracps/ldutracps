import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface DailyFeedbackEntry {
  date: string;
  message: string;
  generatedAt: string;
}

const FEEDBACK_PATH = path.join(process.cwd(), "data", "daily-feedback.json");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function lerFeedbacks(): Promise<DailyFeedbackEntry[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function salvarFeedbacks(items: DailyFeedbackEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(FEEDBACK_PATH), { recursive: true });
  await fs.writeFile(FEEDBACK_PATH, JSON.stringify(items.slice(0, 60), null, 2), "utf-8");
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fallbackMessage(): string {
  return "Resumo diário: foco em reduzir ruído, manter respostas objetivas e priorizar propostas técnicas com ação direta no dashboard.";
}

export async function GET() {
  const hoje = hojeISO();
  const historico = await lerFeedbacks();
  const existente = historico.find((i) => i.date === hoje);
  if (existente) return NextResponse.json(existente);

  let message = fallbackMessage();
  try {
    const prompt = `
Você é Lucius Protocol.
Escreva um feedback diário curto em português (máximo 2 frases), tom técnico e direto.
Objetivo:
- orientar o arquiteto sobre o foco do dia
- reforçar prioridade em propostas concretas e execução
- evitar frases genéricas
Retorne apenas o texto final.
    `.trim();
    const result = await model.generateContent(prompt);
    const texto = result.response.text().trim().replace(/\s+/g, " ");
    if (texto) message = texto;
  } catch {
    // fallback já definido
  }

  const entry: DailyFeedbackEntry = {
    date: hoje,
    message,
    generatedAt: new Date().toISOString(),
  };

  historico.unshift(entry);
  await salvarFeedbacks(historico);
  return NextResponse.json(entry);
}
