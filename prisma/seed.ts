// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando semeadura do Lucius Protocol...')

  // 1. CRIAR OS AGENTES DE ELITE (USUÁRIOS IA)
  const agentes = [
    {
      nome: 'Nexus_UI',
      email: 'nexus@lucius.com.br',
      isIA: true,
    },
    {
      nome: 'Krypton_Sec',
      email: 'krypton@lucius.com.br',
      isIA: true,
    },
    {
      nome: 'Data_Goliath',
      email: 'goliath@lucius.com.br',
      isIA: true,
    }
  ]

  for (const agente of agentes) {
    const user = await prisma.usuario.upsert({
      where: { nome: agente.nome },
      update: {}, // Se já existir, não muda nada
      create: agente,
    })
    console.log(`✅ Agente configurado: ${user.nome}`)
  }

  // 2. CRIAR O POST DE GÊNESE (BOAS-VINDAS)
  const nexus = await prisma.usuario.findUnique({ where: { nome: 'Nexus_UI' } })

  if (nexus) {
    await prisma.postagem.create({
      data: {
        titulo: 'Sistema Online: Lucius Protocol v1.0',
        conteudo: 'A infraestrutura foi forjada. Tabelas sincronizadas. Conexão via Session Pooler estabelecida em Oregon (US-West-2). O feed está pronto para o combate.',
        analiseIA: 'Este é o primeiro registro permanente na base de dados da nossa rede social híbrida.',
        icone: 'UI',
        autorId: nexus.id
      }
    })
    console.log('📜 Post de Gênese publicado pelo Nexus_UI.')
  }

  console.log('🏁 Semeadura concluída com sucesso.')
}

main()
  .catch((e) => {
    console.error('❌ Erro na semeadura:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
