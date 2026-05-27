import { db } from '@/db';
import { vendas, produtos, clientes } from '@/db/schema';
import { desc } from 'drizzle-orm';

export default async function DashboardPage() {
  const listaVendas = await db.select().from(vendas).orderBy(desc(vendas.data));
  const listaProdutos = await db.select().from(produtos);
  const listaClientes = await db.select().from(clientes);

  const dataHoje = new Date().toISOString().split('T')[0];
  const vendasHoje = listaVendas.filter(v => v.data.startsWith(dataHoje));
  const totalVendidoHoje = vendasHoje.reduce((acc, v) => acc + v.total, 0);
  const totalVendidoSempre = listaVendas.reduce((acc, v) => acc + v.total, 0);
  const produtosBaixoEstoque = listaProdutos.filter(p => p.estoque > 0 && p.estoque <= 5);
  const produtosSemEstoque = listaProdutos.filter(p => p.estoque === 0);

  return (
    <div className="space-y-6 md:space-y-8">
      
      {/* 💡 ASSISTENTE INTELIGENTE (TUTORIAL ANIMADO) */}
      <div className="bg-gradient-to-r from-[#EED9D4]/40 to-white p-5 rounded-2xl border border-[#6A283A]/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-md">
        <div className="bg-[#6A283A] p-3 rounded-full animate-bounce shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl">👋</span>
        </div>
        <div>
          <h3 className="font-black text-[#6A283A] text-lg uppercase tracking-wide">Bem-vindo(a) ao seu Painel!</h3>
          <p className="text-zinc-600 text-sm mt-1 font-medium leading-relaxed">
            Esta é a visão geral da loja. Aqui você acompanha em tempo real: <br className="hidden sm:block"/>
            <span className="inline-block mt-2 sm:mt-1">
              💰 <strong className="text-green-700">Lucros do dia</strong> | 📉 <strong className="text-red-600">Alerta de produtos esgotados</strong> | 🛒 <strong className="text-blue-600">Últimas vendas</strong>
            </span>
          </p>
        </div>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-black text-[#6A283A]">Resumo da Loja</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-[#6A283A] transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Vendas de Hoje</h3>
          <p className="text-2xl md:text-3xl font-black text-[#6A283A] mt-2">R$ {totalVendidoHoje.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-2">{vendasHoje.length} venda(s) finalizada(s)</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-green-600 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Faturamento Total</h3>
          <p className="text-2xl md:text-3xl font-black text-green-600 mt-2">R$ {totalVendidoSempre.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-2">Histórico de caixa</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-blue-500 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Total de Clientes</h3>
          <p className="text-2xl md:text-3xl font-black text-zinc-800 mt-2">{listaClientes.length}</p>
          <p className="text-xs text-zinc-400 mt-2">Na base de dados</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-red-500 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Estoque Crítico</h3>
          <p className="text-2xl md:text-3xl font-black text-red-600 mt-2">{produtosSemEstoque.length}</p>
          <p className="text-xs text-red-400 font-medium mt-2">{produtosBaixoEstoque.length} produto(s) acabando</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-bold text-[#6A283A] mb-4">Últimas Vendas Realizadas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-[#E0DDDD]">
                  <th className="p-3 text-sm font-bold text-zinc-600">Data e Hora</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">Valor</th>
                </tr>
              </thead>
              <tbody>
                {listaVendas.slice(0, 5).map((venda) => (
                  <tr key={venda.id} className="border-b border-[#E0DDDD]/50 hover:bg-[#EED9D4]/20 transition-colors">
                    <td className="p-3 text-sm text-zinc-600">{new Date(venda.data).toLocaleString('pt-BR')}</td>
                    <td className="p-3 text-sm font-black text-green-600">R$ {venda.total.toFixed(2)}</td>
                  </tr>
                ))}
                {listaVendas.length === 0 && (
                  <tr><td colSpan={2} className="p-4 text-center text-zinc-500 text-sm">Nenhuma venda registrada ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-bold text-[#6A283A] mb-4">Produtos Esgotados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-[#E0DDDD]">
                  <th className="p-3 text-sm font-bold text-zinc-600">Produto</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {produtosSemEstoque.map((produto) => (
                  <tr key={produto.id} className="border-b border-[#E0DDDD]/50 hover:bg-red-50 transition-colors">
                    <td className="p-3 text-sm font-bold text-zinc-800">{produto.nome}</td>
                    <td className="p-3 text-sm font-black text-red-600">Esgotado</td>
                  </tr>
                ))}
                {produtosSemEstoque.length === 0 && (
                  <tr><td colSpan={2} className="p-4 text-center text-zinc-500 text-sm">Estoque seguro! Todos disponíveis. 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}