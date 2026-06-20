// app/dashboard/historico-caixas/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getHistoricoCaixas, excluirVenda, excluirCaixaInteiro } from './actions';

export default function HistoricoCaixasPage() {
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  
  // Controle para saber qual caixa está "aberto" (expandido) na tabela para ver as vendas
  const [caixaExpandido, setCaixaExpandido] = useState<number | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const res = await getHistoricoCaixas();
    setDados(res);
    setCarregando(false);
  }

  // Ações de Exclusão com Confirmação (Alerta de Segurança)
  const handleExcluirVenda = async (idVenda: number) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR a venda #${idVenda}?\n\nOs produtos voltarão automaticamente para o estoque.`)) {
      setCarregando(true);
      await excluirVenda(idVenda);
      await carregar();
    }
  };

  const handleExcluirCaixa = async (idCaixa: number) => {
    if (window.confirm(`🚨 CUIDADO!\nTem certeza que deseja apagar o CAIXA #${idCaixa} INTEIRO?\n\nIsso vai apagar TODAS as vendas dentro dele e devolver TODO o estoque. Use apenas para limpar testes.`)) {
      setCarregando(true);
      await excluirCaixaInteiro(idCaixa);
      await carregar();
    }
  };

  if (carregando) {
    return (
      <div className="p-8 text-center text-[#6A283A] font-bold animate-pulse text-lg">
        Carregando informações e atualizando o sistema...
      </div>
    );
  }

  const formataMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formataData = (dataStr: string | null) => {
    if (!dataStr) return '-';
    return new Date(dataStr).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6 md:space-y-8">
      
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-[#EED9D4]/40 to-white p-5 rounded-2xl border border-[#6A283A]/20 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#6A283A] flex items-center gap-2 uppercase tracking-wide">
            <span>🗓️</span> Histórico de Caixas e Vendas
          </h2>
          <p className="text-zinc-600 text-sm mt-1 font-medium">
            Acompanhe saldos ou exclua testes. Ao excluir uma venda, o estoque volta automaticamente.
          </p>
        </div>
        <button 
          onClick={carregar}
          className="bg-[#6A283A] text-white text-sm font-bold px-5 py-3 rounded-lg hover:bg-[#521e2d] transition-all uppercase tracking-wider shadow-md active:scale-95 flex items-center gap-2"
        >
          🔄 Atualizar Tabela
        </button>
      </div>
      
      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0DDDD] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#EED9D4]/40 text-[#6A283A]">
              <tr>
                <th className="p-4 font-bold text-sm uppercase tracking-wider w-10 text-center">Ver</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider">Turno</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider">Abertura</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider">Fechamento</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider">Fundo Inicial</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider">Faturamento</th>
                <th className="p-4 font-bold text-sm uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dados.listaCaixas.map((c: any) => {
                
                // Filtra as vendas apenas deste caixa específico
                const vendasDoCaixa = dados.listaVendas.filter((v: any) => v.idCaixa === c.id);
                const faturamentoTurno = vendasDoCaixa.reduce((acc: number, v: any) => acc + v.total, 0);
                const isExpandido = caixaExpandido === c.id;

                return (
                  <React.Fragment key={c.id}>
                    <tr className={`border-b border-[#E0DDDD] transition-colors ${isExpandido ? 'bg-zinc-50' : 'hover:bg-zinc-50'}`}>
                      
                      {/* Botão para Expandir */}
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setCaixaExpandido(isExpandido ? null : c.id)}
                          className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors font-black shadow-sm border ${isExpandido ? 'bg-[#6A283A] text-white border-[#6A283A]' : 'bg-white text-[#6A283A] border-[#E0DDDD] hover:bg-[#EED9D4]'}`}
                          title="Ver vendas deste caixa"
                        >
                          {isExpandido ? '▼' : '▶'}
                        </button>
                      </td>

                      <td className="p-4 font-bold text-zinc-800">
                        Caixa #{c.id}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${c.status === 'aberto' ? 'bg-green-100 text-green-700 border-green-200 animate-pulse' : 'bg-zinc-200 text-zinc-600 border-zinc-300'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-zinc-600">{formataData(c.dataAbertura)}</td>
                      <td className="p-4 text-sm text-zinc-600">{formataData(c.dataFechamento)}</td>
                      <td className="p-4 font-medium text-zinc-700">{formataMoeda(c.saldoInicial)}</td>
                      <td className="p-4 font-black text-green-600">{formataMoeda(faturamentoTurno)}</td>
                      
                      {/* Botão de Excluir o Caixa Todo */}
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleExcluirCaixa(c.id)}
                          className="text-xs bg-white text-red-600 font-bold px-3 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors border border-red-200 shadow-sm"
                        >
                          🗑️ Apagar Caixa
                        </button>
                      </td>
                    </tr>
                    
                    {/* Linha Oculta que aparece quando clica no botão "▶" */}
                    {isExpandido && (
                      <tr className="bg-zinc-100 border-b-2 border-[#E0DDDD]">
                        <td colSpan={7} className="p-0">
                          <div className="p-4 md:p-6 pl-16 border-l-4 border-[#6A283A] m-2 rounded-xl bg-white shadow-inner">
                            <h4 className="font-black text-[#6A283A] mb-4 uppercase text-sm tracking-widest border-b border-zinc-200 pb-2">
                              📋 Vendas Registradas neste Turno ({vendasDoCaixa.length})
                            </h4>
                            
                            {vendasDoCaixa.length === 0 ? (
                              <p className="text-zinc-500 text-sm font-medium">Nenhuma venda realizada neste caixa.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {vendasDoCaixa.map((v: any) => (
                                  <div key={v.id} className="flex justify-between items-center bg-zinc-50 p-4 rounded-xl border border-zinc-200 shadow-sm hover:border-[#6A283A]/30 transition-all">
                                    <div>
                                      <p className="font-black text-zinc-800 text-sm">Venda #{v.id}</p>
                                      <p className="text-xs text-zinc-500 mt-1">{formataData(v.data)}</p>
                                      <span className="inline-block mt-2 px-2 py-0.5 bg-zinc-200 text-zinc-700 text-[10px] font-bold uppercase rounded">
                                        {v.formaPagamento}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <span className="font-black text-green-600 text-lg">{formataMoeda(v.total)}</span>
                                      <button 
                                        onClick={() => handleExcluirVenda(v.id)}
                                        className="text-[11px] font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 px-2 py-1 rounded transition-colors border border-red-100"
                                        title="Estornar Venda e Devolver Estoque"
                                      >
                                        🗑️ Estornar Item
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              
              {dados.listaCaixas.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 font-medium text-lg">
                    Nenhum turno de caixa foi aberto no sistema até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}