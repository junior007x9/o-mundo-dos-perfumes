// app/dashboard/financeiro/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getDadosFinanceiros, registrarDespesa, excluirDespesa } from './actions';

export default function FinanceiroPage() {
  const [listaVendas, setListaVendas] = useState<any[]>([]);
  const [listaDespesas, setListaDespesas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Estados do formulário
  const [descDespesa, setDescDespesa] = useState('');
  const [valorDespesa, setValorDespesa] = useState('');
  const [dataDespesa, setDataDespesa] = useState(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState('Estoque / Mercadoria');

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const res = await getDadosFinanceiros();
    setListaVendas(res.listaVendas);
    setListaDespesas(res.listaDespesas);
    setCarregando(false);
  }

  const handleSalvarDespesa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await registrarDespesa(formData);
    
    setDescDespesa('');
    setValorDespesa('');
    alert('Despesa guardada com sucesso!');
    carregar();
  };

  const handleDelete = async (id: number, descricao: string) => {
    if (confirm(`Tem a certeza que deseja apagar a despesa "${descricao}"?\nIsso vai alterar o seu lucro líquido.`)) {
      await excluirDespesa(id, descricao);
      carregar();
    }
  };

  const formataMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // LÓGICA DE CÁLCULO FINANCEIRO
  const dataHoje = new Date();
  const mesAtual = dataHoje.toISOString().slice(0, 7);

  // 1. Receitas (Faturamento)
  const faturamentoTotal = listaVendas.reduce((acc, v) => acc + v.total, 0);
  const faturamentoMes = listaVendas.filter(v => v.data.startsWith(mesAtual)).reduce((acc, v) => acc + v.total, 0);

  // 2. Despesas
  const despesasTotal = listaDespesas.reduce((acc, d) => acc + d.valor, 0);
  const despesasMes = listaDespesas.filter(d => d.data.startsWith(mesAtual)).reduce((acc, d) => acc + d.valor, 0);

  // 3. Lucro Líquido
  const lucroTotal = faturamentoTotal - despesasTotal;
  const lucroMes = faturamentoMes - despesasMes;

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold animate-pulse">Carregando painel financeiro...</div>;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h2 className="text-2xl font-black text-[#6A283A] flex items-center gap-2">📈 Controle Financeiro</h2>
        <p className="text-zinc-500 text-sm font-medium mt-1">Registe as suas despesas e descubra o seu Lucro Líquido real.</p>
      </div>

      {/* CARDS RESUMO DO MÊS */}
      <h3 className="text-lg font-black text-zinc-700 border-b border-zinc-200 pb-2">📅 Resumo deste Mês</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-blue-500 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Faturamento (Entradas)</h3>
          <p className="text-2xl font-black text-blue-700 mt-2">{formataMoeda(faturamentoMes)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-red-500 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Despesas (Saídas)</h3>
          <p className="text-2xl font-black text-red-600 mt-2">{formataMoeda(despesasMes)}</p>
        </div>
        <div className={`bg-white p-5 rounded-xl border border-[#E0DDDD] border-l-4 shadow-sm ${lucroMes >= 0 ? 'border-l-green-500' : 'border-l-red-600'}`}>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Lucro Líquido do Mês</h3>
          <p className={`text-3xl font-black mt-2 ${lucroMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formataMoeda(lucroMes)}</p>
        </div>
      </div>

      {/* CARDS RESUMO GERAL ACUMULADO */}
      <h3 className="text-lg font-black text-zinc-700 border-b border-zinc-200 pb-2 mt-8">📊 Total Geral Acumulado (Desde o Início)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E0DDDD] shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Entradas</p>
          <p className="text-xl font-black text-zinc-700">{formataMoeda(faturamentoTotal)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E0DDDD] shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Saídas</p>
          <p className="text-xl font-black text-zinc-700">{formataMoeda(despesasTotal)}</p>
        </div>
        <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-900 shadow-sm text-white">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Lucro Histórico</p>
          <p className={`text-xl font-black ${lucroTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formataMoeda(lucroTotal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pt-4">
        
        {/* FORMULÁRIO DE NOVA DESPESA */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-8 h-fit">
          <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-200">
            <h2 className="text-lg font-black text-red-800 flex items-center gap-2 mb-4">
              <span>💸</span> Lançar Despesa
            </h2>
            <form onSubmit={handleSalvarDespesa} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-red-900 block mb-1">Descrição</label>
                <input type="text" name="descricao" required value={descDespesa} onChange={e => setDescDespesa(e.target.value)} className="w-full p-3 rounded-lg bg-white border border-red-200 font-bold text-sm outline-none focus:ring-2 focus:ring-red-400" placeholder="Ex: Conta de Luz, Compra de Estoque..." />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-red-900 block mb-1">Valor (R$)</label>
                  <input type="text" name="valor" required value={valorDespesa} onChange={e => setValorDespesa(e.target.value)} className="w-full p-3 rounded-lg bg-white border border-red-200 font-bold text-sm outline-none focus:ring-2 focus:ring-red-400" placeholder="0,00" />
                </div>
                <div>
                  <label className="text-xs font-bold text-red-900 block mb-1">Data</label>
                  <input type="date" name="data" required value={dataDespesa} onChange={e => setDataDespesa(e.target.value)} className="w-full p-3 rounded-lg bg-white border border-red-200 font-bold text-sm outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-red-900 block mb-1">Categoria</label>
                <select name="categoria" value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full p-3 rounded-lg bg-white border border-red-200 font-bold text-sm outline-none focus:ring-2 focus:ring-red-400">
                  <option value="Estoque / Mercadoria">📦 Estoque / Mercadoria</option>
                  <option value="Prestação do Local - Aluguel">🏠 Prestação do Local - Aluguel</option>
                  <option value="Condomínio">🏢 Condomínio</option>
                  <option value="Conta Fixa (Água/Luz/Net)">💡 Conta Fixa (Água/Luz/Net)</option>
                  <option value="Conta de Celular">📱 Conta de Celular</option>
                  <option value="Estacionamento">🚗 Estacionamento</option>
                  <option value="Programador">💻 Programador</option>
                  <option value="Contador">🧮 Contador</option>
                  <option value="Salários / Funcionários">👥 Salários / Funcionários</option>
                  <option value="Marketing / Anúncios">📱 Marketing / Anúncios</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              
              <button type="submit" className="w-full bg-red-600 text-white font-black py-3 rounded-xl hover:bg-red-700 transition-colors uppercase shadow-md text-sm mt-2">
                Adicionar Saída
              </button>
            </form>
          </div>
        </div>

        {/* TABELA DE DESPESAS */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] flex flex-col">
          <h2 className="text-xl font-bold text-zinc-800 mb-4">Histórico de Saídas</h2>
          
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60 flex-1 max-h-[500px] overflow-y-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-zinc-50 sticky top-0 border-b border-[#E0DDDD] z-10">
                <tr>
                  <th className="p-3 text-xs font-bold text-zinc-600 bg-zinc-50">Data</th>
                  <th className="p-3 text-xs font-bold text-zinc-600 bg-zinc-50">Descrição</th>
                  <th className="p-3 text-xs font-bold text-zinc-600 bg-zinc-50">Categoria</th>
                  <th className="p-3 text-xs font-bold text-zinc-600 bg-zinc-50">Valor</th>
                  <th className="p-3 text-xs font-bold text-zinc-600 text-center bg-zinc-50">Ação</th>
                </tr>
              </thead>
              <tbody>
                {listaDespesas.map((despesa) => (
                  <tr key={despesa.id} className="border-b border-[#E0DDDD]/50 hover:bg-red-50/30 transition-colors">
                    <td className="p-3 text-sm text-zinc-600">{new Date(despesa.data).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 text-sm font-bold text-zinc-800">{despesa.descricao}</td>
                    <td className="p-3 text-xs font-bold text-zinc-500 uppercase"><span className="bg-zinc-100 px-2 py-1 rounded">{despesa.categoria}</span></td>
                    <td className="p-3 text-sm font-black text-red-600">- {formataMoeda(despesa.valor)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleDelete(despesa.id, despesa.descricao)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors font-bold">🗑️ Apagar</button>
                    </td>
                  </tr>
                ))}
                {listaDespesas.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Nenhuma despesa registada ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}