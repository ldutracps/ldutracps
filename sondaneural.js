const fs = require('fs');

console.log("[LUCIUS PROTOCOL] Iniciando Interceptação Direta (Bypass de SDK)...");

// 1. Extração Cirúrgica da Chave API
let apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        const linhas = envFile.split('\n');
        for (const linha of linhas) {
            if (linha.startsWith('GEMINI_API_KEY=')) {
                apiKey = linha.split('=')[1].trim();
                break;
            }
        }
    } catch (e) {
        console.error("✖ FALHA: Não foi possível ler o ficheiro .env.local.");
    }
}

if (!apiKey) {
    console.error("✖ FALHA CRÍTICA: Nenhuma GEMINI_API_KEY encontrada.");
    process.exit(1);
}

// 2. Consulta Direta via REST API (Sem usar o pacote npm)
async function exigirListaDeModelos() {
    console.log(`> Chave interceptada com sucesso. Conectando aos servidores da Google...`);
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error(`\n[ERRO DA GOOGLE]: ${data.error.message}`);
            console.log("A sua chave foi rejeitada pelo servidor central.");
            return;
        }

        console.log("\n==================================================");
        console.log("[VEREDITO SOBERANO] MOTORES DISPONÍVEIS PARA A SUA CHAVE:");
        
        let encontrou = false;
        
        // Filtramos a resposta da Google para mostrar apenas as IAs que geram texto
        data.models.forEach(modelo => {
            if (modelo.supportedGenerationMethods && modelo.supportedGenerationMethods.includes("generateContent")) {
                // A Google devolve "models/nome-do-modelo". Nós limpamos para pegar só o nome.
                const nomeLimpo = modelo.name.replace('models/', '');
                console.log(` ✓ ${nomeLimpo}`);
                encontrou = true;
            }
        });

        if (!encontrou) {
            console.log("✖ Nenhum modelo de geração de texto está liberado para esta chave.");
        }
        console.log("==================================================\n");
        console.log("[AÇÃO TÁTICA]: Copie o NOME EXATO do modelo mais moderno desta lista (ex: gemini-1.5-pro-latest ou gemini-1.5-flash-8b) e cole na linha 33 do seu route.ts.");

    } catch (err) {
        console.error("✖ Falha de conexão na rede:", err.message);
    }
}

exigirListaDeModelos();
