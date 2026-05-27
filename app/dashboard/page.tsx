'use client';

import { useState, useEffect } from 'react';
import { getDadosDashboard } from './dashboardActions';

export default function DashboardPage() {
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const res = await getDadosDashboard();
      setDados(res);
      setCarregando(false);
    }
    carregar();
  }, []);

  // 🚀 EXPORTADOR PERSONALIZADO PARA O EXCEL COM SUA MARCA
  const exportarParaExcel = () => {
    if (!dados || dados.listaVendas.length === 0) return;

    const dadosFormatados = dados.listaVendas.map((v: any) => ({
      'Código do Cupom': v.id,
      'Data e Hora': new Date(v.data).toLocaleString('pt-BR'),
      'Valor da Venda (R$)': v.total.toFixed(2).replace('.', ',')
    }));

    // Criando um cabeçalho de marca personalizado dentro do Excel
    const dataEmissao = new Date().toLocaleString('pt-BR');
    const cabecalhoEmpresa = `O MUNDO DOS PERFUMES - RELATÓRIO GERENCIAL DE VENDAS;;\nData de Emissão: ${dataEmissao};;\n;\n`;

    const colunas = Object.keys(dadosFormatados[0]).join(';');
    const linhas = dadosFormatados.map((row: any) => Object.values(row).join(';')).join('\n');
    
    // Junta o cabeçalho personalizado da marca com os dados da tabela
    const csvCompleto = "\uFEFF" + cabecalhoEmpresa + colunas + '\n' + linhas;

    const blob = new Blob([csvCompleto], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_vendas_mundo_dos_perfumes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold">Carregando Painel Geral...</div>;

  const dataHoje = new Date().toISOString().split('T')[0];
  const vendasHoje = dados.listaVendas.filter((v: any) => v.data.startsWith(dataHoje));
  const totalVendidoHoje = vendasHoje.reduce((acc: number, v: any) => acc + v.total, 0);
  const totalVendidoSempre = dados.listaVendas.reduce((acc: number, v: any) => acc + v.total, 0);
  const produtosBaixoEstoque = dados.listaProdutos.filter((p: any) => p.estoque > 0 && p.estoque <= 5);
  const produtosSemEstoque = dados.listaProdutos.filter((p: any) => p.estoque === 0);

  return (
    <div className="space-y-6 md:space-y-8">
      
      {/* 💡 ASSISTENTE INTELIGENTE */}
      <div className="bg-gradient-to-r from-[#EED9D4]/40 to-white p-5 rounded-2xl border border-[#6A283A]/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-md">
        <div className="bg-[#6A283A] p-3 rounded-full animate-bounce shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl">📊</span>
        </div>
        <div>
          <h3 className="font-black text-[#6A283A] text-lg uppercase tracking-wide">Novidade no seu Painel!</h3>
          <p className="text-zinc-600 text-sm mt-1 font-medium leading-relaxed">
            Agora você pode exportar todo o seu histórico financeiro diretamente para abrir no **Excel** clicando no botão de download abaixo na tabela de vendas!
          </p>
        </div>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-black text-[#6A283A]">Resumo da Loja</h1>
      </div>

      {/* Cards */}
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
          <p className="text-2xl md:text-3xl font-black text-zinc-800 mt-2">{dados.listaClientes.length}</p>
          <p className="text-xs text-zinc-400 mt-2">Na base de dados</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-red-500 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Estoque Crítico</h3>
          <p className="text-2xl md:text-3xl font-black text-red-600 mt-2">{produtosSemEstoque.length}</p>
          <p className="text-xs text-red-400 font-medium mt-2">{produtosBaixoEstoque.length} produto(s) acabando</p>
        </div>
      </div>

      {/* Tabelas Inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-[#6A283A]">Últimas Vendas Realizadas</h2>
            {dados.listaVendas.length > 0 && (
              <button 
                onClick={exportarParaExcel}
                className="bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-green-800 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm uppercase tracking-wider"
              >
                📥 Exportar para Excel
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 border-b border-[#E0DDDD]">
                  <th className="p-3 text-xs font-bold text-zinc-600">Data e Hora</th>
                  <th className="p-3 text-xs font-bold text-zinc-600">Valor</th>
                </tr>
              </thead>
              <tbody>
                {dados.listaVendas.slice(0, 5).map((venda: any) => (
                  <tr key={venda.id} className="border-b border-[#E0DDDD]/50 hover:bg-[#EED9D4]/20 transition-colors">
                    <td className="p-3 text-sm text-zinc-600">{new Date(venda.data).toLocaleString('pt-BR')}</td>
                    <td className="p-3 text-sm font-black text-green-600">R$ {venda.total.toFixed(2)}</td>
                  </tr>
                ))}
                {dados.listaVendas.length === 0 && (
                  <tr><td colSpan={2} className="p-4 text-center text-zinc-500 text-sm">Nenhuma venda registrada ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-bold text-[#6A283A] mb-4">Produtos Esgotados</h2>
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