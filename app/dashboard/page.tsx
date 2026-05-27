import { db } from '@/db';
import { vendas, produtos, clientes } from '@/db/schema';
import { desc } from 'drizzle-orm';

export default async function DashboardPage() {
  // 1. Busca os dados do banco (Vendas, Produtos e Clientes)
  const listaVendas = await db.select().from(vendas).orderBy(desc(vendas.data));
  const listaProdutos = await db.select().from(produtos);
  const listaClientes = await db.select().from(clientes);

  // 2. Cálculos e Filtros Inteligentes
  const dataHoje = new Date().toISOString().split('T')[0]; // Pega apenas a data atual (YYYY-MM-DD)

  // Filtra as vendas que aconteceram hoje
  const vendasHoje = listaVendas.filter(v => v.data.startsWith(dataHoje));
  const totalVendidoHoje = vendasHoje.reduce((acc, v) => acc + v.total, 0);

  // Calcula o histórico geral
  const totalVendidoSempre = listaVendas.reduce((acc, v) => acc + v.total, 0);

  // Verifica o estoque
  const produtosBaixoEstoque = listaProdutos.filter(p => p.estoque > 0 && p.estoque <= 5);
  const produtosSemEstoque = listaProdutos.filter(p => p.estoque === 0);

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#6A283A]">Painel Geral</h1>
        <p className="text-zinc-500 mt-1">Resumo das atividades d'O Mundo dos Perfumes</p>
      </div>

      {/* Cards de Resumo (Topo) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card: Vendas de Hoje */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-[#6A283A] transition-transform hover:scale-105">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Vendas de Hoje</h3>
          <p className="text-3xl font-black text-[#6A283A] mt-2">R$ {totalVendidoHoje.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-2">{vendasHoje.length} venda(s) finalizada(s)</p>
        </div>

        {/* Card: Faturamento Total */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-green-600 transition-transform hover:scale-105">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Faturamento Total</h3>
          <p className="text-3xl font-black text-green-600 mt-2">R$ {totalVendidoSempre.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-2">Histórico de caixa</p>
        </div>

        {/* Card: Clientes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-blue-500 transition-transform hover:scale-105">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Total de Clientes</h3>
          <p className="text-3xl font-black text-zinc-800 mt-2">{listaClientes.length}</p>
          <p className="text-xs text-zinc-400 mt-2">Na base de dados</p>
        </div>

        {/* Card: Alerta de Estoque */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-red-500 transition-transform hover:scale-105">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Estoque Crítico</h3>
          <p className="text-3xl font-black text-red-600 mt-2">{produtosSemEstoque.length}</p>
          <p className="text-xs text-red-400 font-medium mt-2">{produtosBaixoEstoque.length} produto(s) acabando</p>
        </div>
      </div>

      {/* Seção Inferior: Tabelas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Últimas Vendas */}
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
                    <td className="p-3 text-sm text-zinc-600">
                      {new Date(venda.data).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 text-sm font-black text-green-600">
                      R$ {venda.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {listaVendas.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-zinc-500">Nenhuma venda registrada ainda. O caixa está te esperando!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertas de Produtos Esgotados */}
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
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-zinc-500">Estoque seguro! Todos os produtos estão disponíveis. 🎉</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}