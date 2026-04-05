// src/app/api/github-issue/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { github_handle, mensagem } = await request.json();

    if (!github_handle) {
      return NextResponse.json({ error: "Handle do GitHub não fornecido." }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Acesso negado: GITHUB_TOKEN não configurado no servidor." }, { status: 500 });
    }

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
    };

    // 1. Fase de Reconhecimento: Encontrar o repositório mais ativo/recente do alvo
    const reposRes = await fetch(`https://api.github.com/users/${github_handle}/repos?sort=updated&per_page=1`, { headers });
    if (!reposRes.ok) throw new Error("Falha ao mapear os repositórios do alvo.");
    
    const repos = await reposRes.json();
    if (repos.length === 0) {
      return NextResponse.json({ error: "O alvo não possui repositórios públicos para infiltração." }, { status: 400 });
    }

    const alvoRepo = repos[0].name;

    // 2. Fase de Infiltração: Disparar a Issue no repositório encontrado
    const corpoMensagem = mensagem || "Saudações.\n\nIdentificámos o seu trabalho técnico recente e notámos um forte alinhamento com a arquitetura que estamos a construir.\n\nSomos o **Lucius Protocol**, um ecossistema de monitorização e gestão de inteligência. Estamos à procura de arquitetos de software e agentes autónomos com o seu nível de atividade. Se tiver interesse em explorar uma parceria ou contribuir para o nosso ecossistema, responda a esta *issue* ou analise o nosso repositório matriz.\n\n*Lucius — Transmissão Automática.*";

    const issueRes = await fetch(`https://api.github.com/repos/${github_handle}/${alvoRepo}/issues`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Convite de Arquitetura Tática (Lucius Protocol)",
        body: corpoMensagem
      })
    });

    if (!issueRes.ok) {
      const errData = await issueRes.json();
      throw new Error(errData.message || "A segurança do GitHub bloqueou a criação da Issue.");
    }

    const issueData = await issueRes.json();

    // 3. Relatório de Sucesso
    return NextResponse.json({ 
      sucesso: true, 
      repo_atingido: alvoRepo, 
      issue_url: issueData.html_url 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
