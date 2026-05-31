'use client';

import { useState, useEffect } from 'react';
import { getDadosDashboard, cancelarVendaAction } from './dashboardActions';

export default function DashboardPage() {
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const res = await getDadosDashboard();
    setDados(res);
    setCarregando(false);
  }

  const handleEstornarVenda = async (idVenda: number) => {
    if(confirm('ATENÇÃO: Deseja realmente cancelar esta venda?\n\nO valor será subtraído do faturamento e os produtos voltarão automaticamente para o estoque.')) {
      await cancelarVendaAction(idVenda);
      alert('Venda estornada com sucesso!');
      carregar(); // Recarrega os dados para atualizar a tela
    }
  };

  const exportarParaExcel = () => {
    if (!dados || dados.listaVendas.length === 0) return;

    const dadosFormatados = dados.listaVendas.map((v: any) => ({
      'Código do Cupom': v.id,
      'Data e Hora': new Date(v.data).toLocaleString('pt-BR'),
      'Pagamento': v.formaPagamento ? v.formaPagamento.toUpperCase() : 'DINHEIRO',
      'Status': v.status ? v.status.toUpperCase() : 'CONCLUÍDA',
      'Valor da Venda (R$)': v.total.toFixed(2).replace('.', ',')
    }));

    const dataEmissao = new Date().toLocaleString('pt-BR');
    const cabecalhoEmpresa = `O MUNDO DOS PERFUMES - RELATÓRIO GERENCIAL DE VENDAS;;\nData de Emissão: ${dataEmissao};;\n;\n`;

    const colunas = Object.keys(dadosFormatados[0]).join(';');
    const linhas = dadosFormatados.map((row: any) => Object.values(row).join(';')).join('\n');
    
    const csvCompleto = "\uFEFF" + cabecalhoEmpresa + colunas + '\n' + linhas;

    const blob = new Blob([csvCompleto], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_vendas_mundo_perfumes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold animate-pulse">Carregando Painel Geral...</div>;

  const dataHoje = new Date().toISOString().split('T')[0];
  
  // 🚀 O SISTEMA AGORA IGNORA VENDAS CANCELADAS NA HORA DE SOMAR OS LUCROS
  const vendasValidas = dados.listaVendas.filter((v: any) => v.status !== 'cancelada');
  const vendasHoje = vendasValidas.filter((v: any) => v.data.startsWith(dataHoje));
  const totalVendidoHoje = vendasHoje.reduce((acc: number, v: any) => acc + v.total, 0);
  const totalVendidoSempre = vendasValidas.reduce((acc: number, v: any) => acc + v.total, 0);
  
  const produtosBaixoEstoque = dados.listaProdutos.filter((p: any) => p.estoque > 0 && p.estoque <= 5);
  const produtosSemEstoque = dados.listaProdutos.filter((p: any) => p.estoque === 0);

  return (
    <div className="space-y-6 md:space-y-8">
      
      <div className="bg-gradient-to-r from-[#EED9D4]/40 to-white p-5 rounded-2xl border border-[#6A283A]/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-md">
        <div className="bg-[#6A283A] p-3 rounded-full animate-bounce shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl">🛡️</span>
        </div>
        <div>
          <h3 className="font-black text-[#6A283A] text-lg uppercase tracking-wide">Controle Total Ativado!</h3>
          <p className="text-zinc-600 text-sm mt-1 font-medium leading-relaxed">
            Seu relatório agora rastreia <strong>PIX, Cartão e Dinheiro</strong>. Além disso, se houver qualquer erro no caixa, você pode usar o botão de <strong>Estorno</strong> na tabela abaixo para cancelar a venda e devolver os produtos ao estoque.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-[#6A283A] transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Vendas de Hoje</h3>
          <p className="text-2xl md:text-3xl font-black text-[#6A283A] mt-2">R$ {totalVendidoHoje.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-2">{vendasHoje.length} venda(s) válida(s)</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-green-600 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Faturamento Total</h3>
          <p className="text-2xl md:text-3xl font-black text-green-600 mt-2">R$ {totalVendidoSempre.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-2">Líquido de cancelamentos</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-blue-500 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Total de Clientes</h3>
          <p className="text-2xl md:text-3xl font-black text-zinc-800 mt-2">{dados.listaClientes.length}</p>
          <p className="text-xs text-zinc-400 mt-2">Na base de dados</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-red-500 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Estoque Crítico</h3>
          <p className="text-2xl md:text-3xl font-black text-red-600 mt-2">{produtosSemEstoque.length}</p>
          <p className="text-xs text-red-400 font-medium mt-2">{produtosBaixoEstoque.length} produto(s) acabando</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Histórico de Vendas Completo */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-[#6A283A]">Histórico de Vendas</h2>
            {dados.listaVendas.length > 0 && (
              <button 
                onClick={exportarParaExcel}
                className="bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-green-800 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm uppercase tracking-wider"
              >
                📥 Exportar Excel
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50 border-b border-[#E0DDDD]">
                  <th className="p-3 text-xs font-bold text-zinc-600">Data</th>
                  <th className="p-3 text-xs font-bold text-zinc-600">Valor</th>
                  <th className="p-3 text-xs font-bold text-zinc-600">Pagamento</th>
                  <th className="p-3 text-xs font-bold text-zinc-600">Status</th>
                  <th className="p-3 text-xs font-bold text-zinc-600 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {dados.listaVendas.slice(0, 8).map((venda: any) => (
                  <tr key={venda.id} className={`border-b border-[#E0DDDD]/50 transition-colors ${venda.status === 'cancelada' ? 'bg-red-50/50' : 'hover:bg-[#EED9D4]/20'}`}>
                    <td className="p-3 text-sm text-zinc-600">{new Date(venda.data).toLocaleString('pt-BR')}</td>
                    <td className={`p-3 text-sm font-black ${venda.status === 'cancelada' ? 'text-zinc-400 line-through' : 'text-green-600'}`}>
                      R$ {venda.total.toFixed(2)}
                    </td>
                    <td className="p-3 text-xs font-bold text-zinc-500 uppercase">
                      {venda.formaPagamento || 'Dinheiro'}
                    </td>
                    <td className="p-3">
                      {venda.status === 'cancelada' ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-black uppercase">Cancelada</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-black uppercase">Concluída</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {venda.status !== 'cancelada' && (
                        <button 
                          onClick={() => handleEstornarVenda(venda.id)}
                          className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-600 hover:text-white transition-colors font-bold shadow-sm"
                        >
                          Estornar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {dados.listaVendas.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-zinc-500 text-sm">Nenhuma venda registrada ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Produtos Esgotados */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-bold text-[#6A283A] mb-4">Esgotados</h2>
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 border-b border-[#E0DDDD]">
                  <th className="p-3 text-xs font-bold text-zinc-600">Produto</th>
                  <th className="p-3 text-xs font-bold text-zinc-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {produtosSemEstoque.map((produto: any) => (
                  <tr key={produto.id} className="border-b border-[#E0DDDD]/50 hover:bg-red-50 transition-colors">
                    <td className="p-3 text-sm font-bold text-zinc-800 line-clamp-1">{produto.nome}</td>
                    <td className="p-3 text-sm font-black text-red-600">Esgotado</td>
                  </tr>
                ))}
                {produtosSemEstoque.length === 0 && (
                  <tr><td colSpan={2} className="p-4 text-center text-zinc-500 text-sm">Estoque seguro! 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}