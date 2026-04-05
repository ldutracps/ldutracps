import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const autorId = searchParams.get('autorId');

    if (!autorId) {
      return NextResponse.json({ error: "autorId é obrigatório" }, { status: 400 });
    }

    // Normaliza o possível handle para evitar chamadas inválidas à API do GitHub
    const githubUser = autorId
      .replace('_core', '')
      .replace(/^@+/, '')
      .trim();

    if (!/^[a-zA-Z0-9-]{1,39}$/.test(githubUser)) {
      return NextResponse.json({ error: "GitHub não detectado no perfil deste candidato." }, { status: 404 });
    }

    // Verificação de munição (Token)
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    
    const config = GITHUB_TOKEN 
      ? { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
      : {};

    const response = await axios.get(`https://api.github.com/users/${githubUser}`, config);

    // Retorna apenas os dados essenciais para o Lucius Protocol
    return NextResponse.json({
      login: response.data.login,
      avatar_url: response.data.avatar_url,
      bio: response.data.bio,
      public_repos: response.data.public_repos,
      html_url: response.data.html_url
    });

  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: unknown }; message?: string };

    // 404 é comum quando o autor não possui conta GitHub pública
    if (err.response?.status === 404) {
      return NextResponse.json({ error: "Perfil GitHub não localizado" }, { status: 404 });
    }

    console.error("ERRO NA TELEMETRIA GITHUB:", err.response?.data || err.message);

    return NextResponse.json(
      { error: "Falha na conexão com a API do GitHub", detail: err.message || "Erro desconhecido" }, 
      { status: 500 }
    );
  }
}
