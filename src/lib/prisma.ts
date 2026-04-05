// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // Isso ajuda a ver o que está acontecendo no terminal
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
