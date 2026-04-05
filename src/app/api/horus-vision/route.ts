import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Nenhum sinal visual recebido pelo terminal." }, { status: 400 });
    }

    // Isolar o payload base64 do cabeçalho da imagem (data:image/jpeg;base64,...)
    const base64Data = image.split(",")[1];
    const mimeType = image.substring(image.indexOf(":") + 1, image.indexOf(";"));

    // Inicializa o motor neural com a sua chave
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    
    // HOT-FIX: Atualizado para o motor mais recente e letal conforme ordem do Arquiteto
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // O Prompt Estrutural: Forçamos a IA a não conversar, apenas a devolver um JSON rigoroso.
    const prompt = `[DIRETRIZ DE SISTEMA SOBERANO: LUCIUS PROTOCOL]
    Você é o 'Olho de Hórus', o motor de visão computacional industrial.
    Examine a imagem em anexo. Ela pode conter painéis industriais, contadores analógicos/digitais, QR Codes, hardware, placas ou telas de sistemas legados.
    Extraia os dados através de OCR e análise técnica.
    
    Retorne EXATAMENTE UM ÚNICO OBJETO JSON VÁLIDO. Não utilize formatação markdown (\`\`\`json), apenas o objeto puro.
    
    Estrutura obrigatória do JSON:
    {
      "alvo_identificado": "Descrição curta do que é a imagem (ex: Placa-mãe, Medidor de Pressão, Tela de Erro)",
      "maquina_id": "Se houver QR Code, etiqueta de patrimônio ou MAC address, extraia aqui. Senão, 'N/A'",
      "leitura_contador": "Se houver números em medidores/telas, extraia o valor exato. Senão, 'N/A'",
      "diagnostico_tecnico": "Sua análise profunda: há defeitos visíveis? O que as luzes/telas indicam? Qual o estado do hardware?",
      "fator_risco": "CRÍTICO, MODERADO, ESTÁVEL ou INDETERMINADO",
      "protocolo_recomendado": "Ação imediata que o engenheiro de manutenção deve tomar em 1 frase."
    }`;

    // Execução da varredura visual
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    const responseText = result.response.text();
    
    // Tratamento de purificação: Garante que apenas o JSON seja extraído, mesmo que a IA tente enviar texto extra.
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        const dadosEstruturados = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ sucesso: true, dados: dadosEstruturados });
    } else {
        return NextResponse.json({ error: "Falha na decodificação do sinal visual para JSON estruturado." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[LUCIUS PROTOCOL] Falha no motor de visão:", error);
    return NextResponse.json({ error: error.message || "Erro interno no processamento visual." }, { status: 500 });
  }
}
