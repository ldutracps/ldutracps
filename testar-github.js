// testar-github.js
// Script autônomo do Lucius para testar a existência e o retorno da API do GitHub.

async function dispararSonda() {
  console.log("==================================================");
  console.log("[LUCIUS] Iniciando varredura na rota de Perfil Técnico...");
  console.log("==================================================\n");

  try {
    // Apontamos a sonda para o seu servidor local (Next.js precisa estar rodando)
    // Usamos um 'autorId' genérico de teste chamado 'alvo_teste'
    const url = "http://localhost:3000/api/github-profile?autorId=alvo_teste";
    console.log(`[LUCIUS] Disparando requisição GET para: ${url}`);
    
    const resposta = await fetch(url);
    
    // O Status Code é o diagnóstico principal. 
    // 200 = Sucesso. 404 = Não existe. 500 = Erro no código do Cursor.
    console.log(`\n[LUCIUS] Status HTTP Recebido: ${resposta.status} ${resposta.statusText}`);

    if (resposta.status === 404) {
      console.log("[LUCIUS] ⚠️ DIAGNÓSTICO: O Cursor NÃO criou o arquivo da API (Erro 404).");
      return;
    }

    // Se respondeu, vamos ler o que a API enviou de volta.
    const dados = await resposta.json();
    
    console.log("\n[LUCIUS] Carga de Dados Interceptada:");
    console.log(JSON.stringify(dados, null, 2));

    if (dados.briefing) {
      console.log("\n[LUCIUS] ✅ DIAGNÓSTICO: O motor está completo e gerando o briefing!");
    } else {
      console.log("\n[LUCIUS] ⚠️ DIAGNÓSTICO: A rota existe, mas o motor não está retornando o formato correto (falta o 'briefing').");
    }

  } catch (erro) {
    console.error("\n[LUCIUS] ❌ ERRO CRÍTICO DE CONEXÃO:");
    console.error("Motivo:", erro.message);
    console.log("Dica: Certifique-se de que o servidor do Next.js (npm run dev) está rodando em outro terminal.");
  }
}

// Executa a função
dispararSonda();
