import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface RosieAlerta {
  id: string;
  postId: string;
  commentId: string;
  postTitulo: string;
  comentario: string;
  autorId: string;
  isRead: boolean;
  isReply: boolean;
  criadoEm: string;
  tipo: "TECNICO";
  resumo: string;
}

const ALERTAS_PATH = path.join(process.cwd(), "data", "rosie-alerts.json");

async function lerAlertas(): Promise<RosieAlerta[]> {
  try {
    const raw = await fs.readFile(ALERTAS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function salvarAlertas(alertas: RosieAlerta[]): Promise<void> {
  await fs.mkdir(path.dirname(ALERTAS_PATH), { recursive: true });
  await fs.writeFile(ALERTAS_PATH, JSON.stringify(alertas, null, 2), "utf-8");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Segurança: Token de autenticação da Rosie
    const TOKEN_ESPERADO = process.env.ROSIE_SECRET_TOKEN || "lucius_alpha_protocol_2026";
    if (body.token_seguranca !== TOKEN_ESPERADO) {
      return NextResponse.json({ erro: "Acesso Negado." }, { status: 401 });
    }

    const alerta: RosieAlerta = {
      id: `rosie_${Date.now()}`,
      postId: "AUDITORIA_FEDERAL",
      commentId: `rosie_comment_${Date.now()}`,
      postTitulo: "ALERTA DE AUDITORIA GOVERNAMENTAL (ROSIE)",
      comentario: `Anomalia detectada por Rosie em ${body.politico_nome}.`,
      autorId: "ROSIE_BOT",
      tipo: "TECNICO",
      resumo: `FRAUDE: R$ ${Number(body.valor_suspeito || 0).toFixed(2)} | POLITICO: ${body.politico_nome || "N/A"} | PARTIDO: ${body.partido || "N/A"} | CERTEZA: ${body.nivel_certeza || 0}% | MOTIVO: ${body.descricao_despesa || "N/A"} | DOC: ${body.link_nota_fiscal || "N/A"}`,
      isRead: false,
      isReply: false,
      criadoEm: new Date().toISOString(),
    };

    const alertas = await lerAlertas();
    alertas.unshift(alerta);
    await salvarAlertas(alertas.slice(0, 200));

    console.log(`[LUCIUS] Alerta ${alerta.id} persistido no webhook Rosie.`);
    return NextResponse.json({ status: "sucesso", id: alerta.id }, { status: 200 });

  } catch (error) {
    console.error("Erro no Webhook:", error);
    return NextResponse.json({ erro: "Falha na gravação" }, { status: 500 });
  }
}

export async function GET() {
  const alertas = await lerAlertas();
  return NextResponse.json({ notificacoes: alertas });
}
