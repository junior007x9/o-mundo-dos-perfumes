import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Pega o cookie gerado no momento do login
  const token = request.cookies.get('usuario_logado_id')?.value;
  const path = request.nextUrl.pathname;

  // 1. Se tentar acessar qualquer página do /dashboard SEM estar logado -> expulsa para o login
  if (path.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Se já estiver logado e tentar acessar a tela de Login (/) -> manda pro dashboard
  if (path === '/' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Se estiver tudo certo, deixa o usuário seguir
  return NextResponse.next();
}

// Diz para o Next.js em quais rotas esse "guarda-costas" deve atuar
export const config = {
  matcher: ['/', '/dashboard/:path*'],
};