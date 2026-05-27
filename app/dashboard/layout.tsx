import Link from 'next/link';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#E0DDDD]/20">
      
      <aside className="w-64 bg-[#6A283A] text-white flex flex-col justify-between p-4 shadow-2xl z-10">
        <div>
          <div className="mb-6 px-2 py-6 border-b border-[#EED9D4]/20 flex flex-col items-center rounded-xl">
            <div className="relative w-full h-24 mb-1">
              <Image 
                src="/logo.png" 
                alt="Logo O Mundo dos Perfumes" 
                fill
                className="object-contain"
              />
            </div>
            <p className="text-xs text-[#EED9D4] uppercase tracking-widest font-bold text-center mt-2">
              Painel Admin
            </p>
          </div>

          <nav className="space-y-2 mt-4">
            <Link href="/dashboard" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-lg">📊</span><span>Painel Geral</span>
            </Link>
            <Link href="/dashboard/caixa" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-lg">💰</span><span>Caixa / PDV</span>
            </Link>
            <Link href="/dashboard/produtos" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-lg">🛍️</span><span>Produtos & Estoque</span>
            </Link>
            <Link href="/dashboard/clientes" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-lg">👥</span><span>Clientes</span>
            </Link>
            <Link href="/dashboard/vendedores" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-lg">👔</span><span>Vendedores</span>
            </Link>
            {/* NOVO LINK AQUI */}
            <Link href="/dashboard/fornecedores" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#EED9D4] hover:text-[#6A283A] transition-all text-white/90">
              <span className="text-lg">🚚</span><span>Fornecedores</span>
            </Link>
          </nav>
        </div>

        <div className="pt-4 border-t border-[#EED9D4]/20 mt-4">
          <Link href="/" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold bg-black/20 text-[#EED9D4] hover:bg-red-600 hover:text-white transition-all shadow-inner">
            <span className="text-lg">🚪</span><span>Sair do Sistema</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}