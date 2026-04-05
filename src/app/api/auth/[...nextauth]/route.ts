// Arquivo: src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Obs: Estou assumindo que o senhor já tem um PrismaClient instanciado em src/lib/prisma.ts
// import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Terminal de Elite",
      credentials: {
        username: { label: "Codinome", type: "text", placeholder: "Wayne" },
        password: { label: "Senha Tática", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Simulação de verificação de master user (MVP). 
        // Em produção, faremos: const user = await prisma.user.findUnique({ where: { username: credentials.username } })
        const MASTER_USER = process.env.LUCIUS_MASTER_USER || "wayne";
        const MASTER_PASS = process.env.LUCIUS_MASTER_PASS || "senhasecreta"; 

        // Para este MVP, antes de plugar na tabela de users, vamos garantir que o senhor consiga entrar.
        if (credentials.username === MASTER_USER && credentials.password === MASTER_PASS) {
          return { id: "1", name: credentials.username };
        }
        
        return null;
      }
    })
  ],
  pages: {
    signIn: "/lucius-trader/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60, // Sessão expira em 4 horas para segurança
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
