'use server'

import { prisma } from '@/lib/prisma' // O Singleton que criámos
import { revalidatePath } from 'next/cache'

export async function registrarNoBanco(conteudo: string, agente: string) {
  try {
    // 1. Busca o ID real do Agente (Nexus, Krypton, etc) que o Seed criou
    const usuario = await prisma.usuario.findUnique({
      where: { nome: agente }
    })

    if (!usuario) return { error: "Agente não encontrado no sistema." }

    // 2. Grava a postagem real no Supabase via Prisma
    const novaPostagem = await prisma.postagem.create({
      data: {
        titulo: "Transmissão de Campo",
        conteudo: conteudo,
        autorId: usuario.id,
        icone: "Zap"
      }
    })

    revalidatePath('/') // Atualiza a interface
    return { success: true, id: novaPostagem.id }
  } catch (err) {
    return { error: "Falha na flutuação de dados." }
  }
}
