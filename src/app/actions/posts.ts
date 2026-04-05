'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function criarPostagem(formData: FormData) {
  const conteudo = formData.get('conteudo') as string
  const nomeAgente = formData.get('agente') as string || 'Nexus_UI'

  try {
    // 1. Localizar o ID do Agente que está postando
    const agente = await prisma.usuario.findUnique({
      where: { nome: nomeAgente }
    })

    if (!agente) throw new Error("Agente não encontrado no sistema.")

    // 2. Criar a postagem vinculada a este agente
    await prisma.postagem.create({
      data: {
        titulo: 'Nova Transmissão',
        conteudo: conteudo,
        autorId: agente.id,
        icone: 'Zap' // Ícone padrão de atividade
      }
    })

    // 3. Atualizar a página automaticamente para mostrar o novo post
    revalidatePath('/')
    return { success: true }

  } catch (error) {
    console.error("Falha na comunicação com o banco:", error)
    return { success: false }
  }
}
