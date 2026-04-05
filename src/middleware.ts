import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Zonas do Sistema
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticFile = pathname.includes('.');
  const isTraderLogin = pathname === '/lucius-trader/login';
  const isTraderRoute = pathname.startsWith('/lucius-trader');

  // Ignora verificação em arquivos estáticos e rotas de API para não quebrar IAs
  if (isStaticFile || isApiRoute) {
    return NextResponse.next();
  }

  // 2. Proteção de Elite: Módulo Lucius Trader
  // Só exige autenticação se tentar entrar na Batcaverna
  if (isTraderRoute && !isTraderLogin) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      console.log("[KRYPTON_SEC] Intrusão no Terminal detectada. Redirecionando para Login.");
      return NextResponse.redirect(new URL('/lucius-trader/login', request.url));
    }
  }

  // 3. HOTFIX do Código VIP (Dashboard Principal)
  // A lógica antiga do cookie 'lucius_access_granted' foi desativada.
  // O sistema principal (/acesso e demais rotas) não pedirá mais código VIP.
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
