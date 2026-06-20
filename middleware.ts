// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Pega os cookies gerados no momento do login
  const token = request.cookies.get('usuario_logado_id')?.value;
  const cargo = request.cookies.get('usuario_logado_cargo')?.value; // 🚀 Lendo o cargo
  const path = request.nextUrl.pathname;

  // 1. Se tentar acessar qualquer página do /dashboard SEM estar logado -> expulsa para o login
  if (path.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Se já estiver logado e tentar acessar a tela de Login (/) -> manda pro sistema
  if (path === '/' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. 🚀 SEGURANÇA DE ROTAS: O que o VENDEDOR NÃO PODE acessar
  if (cargo === 'vendedor' && path.startsWith('/dashboard')) {
    // Lista de pastas que são exclusivas do Admin
    const rotasBloqueadasParaVendedor = [
      '/dashboard/produtos', 
      '/dashboard/fornecedores', 
      '/dashboard/vendedores',
      '/dashboard/historico-caixas'
      // O Vendedor poderá acessar apenas /dashboard (home), /dashboard/caixa e /dashboard/clientes
    ];

    const tentouAcessarRotaBloqueada = rotasBloqueadasParaVendedor.some(rota => path.startsWith(rota));

    if (tentouAcessarRotaBloqueada) {
      // Se ele tentar dar um "jeitinho" pela barra de endereço, é expulso pro Caixa
      return NextResponse.redirect(new URL('/dashboard/caixa', request.url));
    }
  }

  // Se estiver tudo certo, deixa o usuário seguir
  return NextResponse.next();
}

// Diz para o Next.js em quais rotas esse "guarda-costas" deve atuar
export const config = {
  matcher: ['/', '/dashboard/:path*'],
};