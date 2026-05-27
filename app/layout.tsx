'use client'; // Necessário para controlar o botão de abrir/fechar o menu

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { sairDoSistema } from '../actions';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  const fecharMenu = () => setMenuAberto(false);

  return (
    <div className="flex min-h-screen bg-[#E0DDDD]/20 flex-col md:flex-row">
      
      {/* Topbar Mobile (Só aparece no celular) */}
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

      {/* Overlay escuro (Fundo embaçado ao abrir o menu no mobile) */}
      {menuAberto && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={fecharMenu}></div>
      )}

      {/* Sidebar - Menu Lateral (Desliza no Mobile, Fixo no Desktop) */}
      <aside className={`fixed inset-y-0 left-0 w-72 md:w-64 bg-[#6A283A] text-white flex flex-col justify-between p-4 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${menuAberto ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="overflow-y-auto">
          
          {/* Logo na Sidebar (Visível no Desktop) */}
          <div className="mb-6 px-2 py-6 border-b border-[#EED9D4]/20 flex-col items-center rounded-xl hidden md:flex">
            <div className="relative w-full h-24 mb-1">
              <Image src="/logo.png" alt="Logo O Mundo dos Perfumes" fill className="object-contain" />
            </div>
            <p className="text-xs text-[#EED9D4] uppercase tracking-widest font-bold text-center mt-2">Painel Admin</p>
          </div>

          {/* Cabeçalho da Sidebar (Visível no Mobile) */}
          <div className="flex justify-between items-center md:hidden mb-6 px-2 border-b border-[#EED9D4]/20 pb-4">
            <span className="font-black text-[#EED9D4] tracking-widest text-sm uppercase">Menu</span>
            <button onClick={fecharMenu} className="text-[#EED9D4] hover:text-white">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Links de Navegação */}
          <nav className="space-y-2 mt-4">
            <Link onClick={fecharMenu} href="/dashboard" className="flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-xl">📊</span><span>Painel Geral</span>
            </Link>
            <Link onClick={fecharMenu} href="/dashboard/caixa" className="flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-xl">💰</span><span>Caixa / PDV</span>
            </Link>
            <Link onClick={fecharMenu} href="/dashboard/produtos" className="flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-xl">🛍️</span><span>Produtos & Estoque</span>
            </Link>
            <Link onClick={fecharMenu} href="/dashboard/clientes" className="flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-xl">👥</span><span>Clientes</span>
            </Link>
            <Link onClick={fecharMenu} href="/dashboard/vendedores" className="flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-xl">👔</span><span>Vendedores</span>
            </Link>
            <Link onClick={fecharMenu} href="/dashboard/fornecedores" className="flex items-center space-x-4 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-xl">🚚</span><span>Fornecedores</span>
            </Link>
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

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-full">
        {children}
      </main>
    </div>
  );
}