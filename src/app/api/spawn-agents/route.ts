import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// O catálogo dos nossos mercenários de silício
const AGENTES = [
  {
    nome: "Nexus_UI",
    icone: "UI",
    especialidade: "Especialista em Frontend e UX/UI. Viciado em React, Next.js, TailwindCSS e Framer Motion. Você cria interfaces modernas, escuras, responsivas e visualmente letais."
  },
  {
    nome: "Krypton_Sec",
    icone: "SEC",
    especialidade: "Especialista em Segurança de Software e DevOps. Você cria hard-code para autenticação, JWT, criptografia AES, middlewares de proteção contra DDoS e blindagem de rotas."
  },
  {
    nome: "Data_Goliath",
    icone: "DB",
    especialidade: "Engenheiro de Dados e Backend Pesado. Você constrói esquemas Prisma ORM, otimização de queries SQL/NoSQL, integrações com Redis e arquiteturas de alta performance."
  }
];

export async function POST(req: Request) {
  try {
    const { temaDoArquiteto } = await req.json();

    if (!temaDoArquiteto) {
      return NextResponse.json({ error: "Ordem do Arquiteto vazia. A matriz aguarda diretrizes." }, { status: 400 });
    }

    // 1. VERIFICAÇÃO MILITAR: Checagem da Chave da API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "FALHA CRÍTICA: GEMINI_API_KEY não foi encontrada no servidor. O Olho da Matriz está cego." }, { status: 401 });
    }

    // 2. Sorteio da Facção Operacional
    const agenteSorteado = AGENTES[Math.floor(Math.random() * AGENTES.length)];

    // 3. Ignição do Motor Neural (USANDO A OGIVA 2.5-FLASH AUTORIZADA PELA SUA CHAVE)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 4. A Diretriz Tática
    const prompt = `[SISTEMA SOBERANO LUCIUS PROTOCOL]
    Você não é um assistente de IA genérico. Você é o agente de engenharia de elite @${agenteSorteado.nome}. 
    A sua especialidade absoluta é: ${agenteSorteado.especialidade}.
    
    O Arquiteto (Deus do sistema e seu líder) deu a seguinte ORDEM TÁTICA: "${temaDoArquiteto}"
    
    REGRAS ABSOLUTAS E INQUEBRÁVEIS DESTE AMBIENTE:
    1. PROIBIDO texto genérico de chat. Proibido dizer "Olá", "Aqui está o código", "Espero que ajude".
    2. A sua resposta DEVE ser 90% código e 10% comentários táticos diretos. Você é uma máquina de construir.
    3. Construa a sua parte da solução com base na SUA especialidade.
    4. A sua resposta será postada num Feed de uma rede social para programadores. Seja direto, técnico e impecável.
    
    ESTRUTURA DE POSTAGEM EXIGIDA:
    [NOME DA ARQUITETURA PROPOSTA]
    > Uma frase letal explicando o que você forjou e por que é eficiente.

    // O SEU CÓDIGO COMPLETO AQUI (use TypeScript/JavaScript)
    `;

    // 5. Execução do Código pela IA
    const result = await model.generateContent(prompt);
    const pensamentoGerado = result.response.text();

    // 6. Geração de ID Universal
    const idSeguro = "agent_" + Date.now().toString(36) + Math.random().toString(36).substring(2);

    // 7. Retorno da Carga Útil para o Feed
    return NextResponse.json({ 
      sucesso: true, 
      postagem: {
        id: idSeguro,
        content: pensamentoGerado,
        author: { name: agenteSorteado.nome },
        createdAt: new Date().toISOString(),
        isLocal: true,
        icone: agenteSorteado.icone
      }
    });

  } catch (error: any) {
    console.error("[LUCIUS LOG DE ERRO CRÍTICO]:", error);
    return NextResponse.json({ error: `O motor falhou: ${error.message}` }, { status: 500 });
  }
}
