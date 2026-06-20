// app/dashboard/layout.tsx
'use client'; 

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { sairDoSistema, getUsuarioLogado } from '../actions';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [usuario, setUsuario] = useState<{ nome: string; cargo: string } | null>(null);
  const [carregando, setCarregando] = useState(true);

  const fecharMenu = () => setMenuAberto(false);

  useEffect(() => {
    async function carregarPermissoes() {
      const dados = await getUsuarioLogado();
      setUsuario(dados);
      setCarregando(false);
    }
    carregarPermissoes();
  }, []);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0DDDD]/20">
        <div className="text-center text-[#6A283A] font-bold animate-pulse">
          Verificando permissões de acesso...
        </div>
      </div>
    );
  }

  const isAdmin = usuario?.cargo === 'admin';

  // 🚀 ATUALIZADO: Novas rotas administrativas protegidas contra vendedores
  const rotasBloqueadasParaVendedor = [
    '/dashboard/produtos',
    '/dashboard/vendedores',
    '/dashboard/fornecedores',
    '/dashboard/caixas',       // Nova Auditoria de Caixas
    '/dashboard/financeiro'    // Novo Controle Financeiro
  ];

  const acessoBloqueado = !isAdmin && rotasBloqueadasParaVendedor.includes(pathname);

  return (
    <div className="flex min-h-screen bg-[#E0DDDD]/20 flex-col md:flex-row">
      
      {/* Topbar Mobile */}
      <div className="md:hidden bg-[#6A283A] text-white p-4 flex justify-between items-center shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 bg-white rounded-full p-1 shadow-inner">
            <Image src="/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <span className="font-bold text-[#EED9D4] tracking-widest text-xs uppercase">O Mundo dos Perfumes</span>
        </div>
        <button onClick={() => setMenuAberto(!menuAberto)} className="p-2 text-[#EED9D4] hover:text-white transition-colors">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuAberto ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuAberto && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={fecharMenu}></div>
      )}

      {/* Sidebar - Menu Lateral */}
      <aside className={`fixed inset-y-0 left-0 w-72 md:w-64 bg-[#6A283A] text-white flex flex-col justify-between p-4 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${menuAberto ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="overflow-y-auto">
          
          <div className="mb-6 px-2 py-5 border-b border-[#EED9D4]/20 flex flex-col items-center rounded-xl">
            <div className="relative w-16 h-16 mb-2 rounded-full bg-white/10 flex items-center justify-center text-2xl border border-white/10">
              {isAdmin ? '👑' : '👔'}
            </div>
            <p className="font-bold text-white text-sm text-center line-clamp-1">{usuario?.nome}</p>
            <p className="text-[10px] text-[#EED9D4] uppercase tracking-widest font-black mt-0.5 bg-black/20 px-2.5 py-0.5 rounded-full">
              {usuario?.cargo}
            </p>
          </div>

          <nav className="space-y-1.5">
            
            <Link onClick={fecharMenu} href="/dashboard" className={`flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all ${pathname === '/dashboard' ? 'bg-[#EED9D4] text-[#6A283A]' : 'text-white/90'}`}>
              <span className="text-xl">{isAdmin ? '📊' : '🎯'}</span>
              <span>{isAdmin ? 'Painel Geral' : 'Minhas Vendas'}</span>
            </Link>

            <Link onClick={fecharMenu} href="/dashboard/caixa" className={`flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all ${pathname === '/dashboard/caixa' ? 'bg-[#EED9D4] text-[#6A283A]' : 'text-white/90'}`}>
              <span className="text-xl">💰</span><span>Caixa / PDV</span>
            </Link>

            <Link onClick={fecharMenu} href="/dashboard/clientes" className={`flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all ${pathname === '/dashboard/clientes' ? 'bg-[#EED9D4] text-[#6A283A]' : 'text-white/90'}`}>
              <span className="text-xl">👥</span><span>Clientes</span>
            </Link>

            {isAdmin && (
              <>
                <Link onClick={fecharMenu} href="/dashboard/produtos" className={`flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all ${pathname === '/dashboard/produtos' ? 'bg-[#EED9D4] text-[#6A283A]' : 'text-white/90'}`}>
                  <span className="text-xl">🛍️</span><span>Produtos & Estoque</span>
                </Link>

                {/* 🚀 NOVOS BOTÕES ADICIONADOS AQUI */}
                <Link onClick={fecharMenu} href="/dashboard/caixas" className={`flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all ${pathname === '/dashboard/caixas' ? 'bg-[#EED9D4] text-[#6A283A]' : 'text-white/90'}`}>
                  <span className="text-xl">🔐</span><span>Auditoria de Caixas</span>
                </Link>

                <Link onClick={fecharMenu} href="/dashboard/financeiro" className={`flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all ${pathname === '/dashboard/financeiro' ? 'bg-[#EED9D4] text-[#6A283A]' : 'text-white/90'}`}>
                  <span className="text-xl">📈</span><span>Financeiro</span>
                </Link>
                {/* ---------------------------------- */}

                <Link onClick={fecharMenu} href="/dashboard/vendedores" className={`flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all ${pathname === '/dashboard/vendedores' ? 'bg-[#EED9D4] text-[#6A283A]' : 'text-white/90'}`}>
                  <span className="text-xl">👔</span><span>Vendedores</span>
                </Link>
                
                <Link onClick={fecharMenu} href="/dashboard/fornecedores" className={`flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all ${pathname === '/dashboard/fornecedores' ? 'bg-[#EED9D4] text-[#6A283A]' : 'text-white/90'}`}>
                  <span className="text-xl">🚚</span><span>Fornecedores</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#EED9D4]/20 mt-4">
          <form action={sairDoSistema}>
            <button type="submit" className="w-full flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold bg-black/20 text-[#EED9D4] hover:bg-red-600 hover:text-white transition-all shadow-inner">
              <span className="text-xl">🚪</span><span>Sair do Sistema</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-full">
        {acessoBloqueado ? (
          <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl shadow-xl border border-red-200 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-red-200">
              🛑
            </div>
            <h2 className="text-2xl font-black text-red-800 uppercase tracking-wide">Acesso Restrito</h2>
            <p className="text-zinc-600 font-medium text-sm mt-2 mb-6">
              Sua conta de <strong>Vendedor</strong> não tem permissão para visualizar esta página de gerenciamento.
            </p>
            <Link href="/dashboard/caixa" className="inline-block bg-[#6A283A] text-white font-black py-3 px-6 rounded-xl hover:bg-[#521e2d] transition-all uppercase tracking-wider text-sm shadow-md">
              Voltar para o Caixa
            </Link>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}