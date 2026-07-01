// app/dashboard/financeiro/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getDadosFinanceiros, registrarDespesa, excluirDespesa } from './actions';

export default function FinanceiroPage() {
  const [listaVendas, setListaVendas] = useState<any[]>([]);
  const [listaDespesas, setListaDespesas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // 🚀 NOVO: ESTADO GLOBAL DO MÊS SELECIONADO (Inicia no mês atual)
  const [mesSelecionado, setMesSelecionado] = useState(() => new Date().toISOString().slice(0, 7));

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

  // ============================================================================
  // 🚀 LÓGICA DE CÁLCULO FINANCEIRO (Agora conectada ao Filtro de Mês!)
  // ============================================================================
  
  // 1. Receitas (Faturamento)
  const faturamentoTotal = listaVendas.reduce((acc, v) => acc + v.total, 0);
  const faturamentoMes = listaVendas.filter(v => v.data.startsWith(mesSelecionado)).reduce((acc, v) => acc + v.total, 0);

  // 2. Despesas
  const despesasTotal = listaDespesas.reduce((acc, d) => acc + d.valor, 0);
  const despesasMes = listaDespesas.filter(d => d.data.startsWith(mesSelecionado)).reduce((acc, d) => acc + d.valor, 0);

  // 3. Lucro Líquido
  const lucroTotal = faturamentoTotal - despesasTotal;
  const lucroMes = faturamentoMes - despesasMes;

  // Filtra as despesas da tabela para o mês escolhido
  const despesasFiltradas = listaDespesas.filter(d => d.data.startsWith(mesSelecionado));

  // ============================================================================
  // 🚀 EXPORTAÇÃO INTELIGENTE PARA O FINANCEIRO
  // ============================================================================
  const exportarParaExcel = () => {
    const dataEmissao = new Date().toLocaleString('pt-BR');
    
    let csvCompleto = "\uFEFF"; 
    csvCompleto += "O MUNDO DOS PERFUMES\nRELATÓRIO FINANCEIRO GERENCIAL\n";
    csvCompleto += `Mês de Referência: ${mesSelecionado.split('-').reverse().join('/')}\n`;
    csvCompleto += `Data de Emissão: ${dataEmissao}\n\n`;
    
    csvCompleto += "--- RESUMO DO MÊS ---\n";
    csvCompleto += `Faturamento (Entradas);${faturamentoMes.toFixed(2).replace('.', ',')}\n`;
    csvCompleto += `Despesas (Saídas);${despesasMes.toFixed(2).replace('.', ',')}\n`;
    csvCompleto += `LUCRO LÍQUIDO;${lucroMes.toFixed(2).replace('.', ',')}\n\n`;

    csvCompleto += "--- DETALHAMENTO DE DESPESAS ---\n";
    csvCompleto += "Data;Descrição;Categoria;Valor da Despesa (R$)\n";

    despesasFiltradas.forEach((d: any) => {
      const dData = new Date(d.data).toLocaleDateString('pt-BR');
      const dValor = d.valor.toFixed(2).replace('.', ',');
      csvCompleto += `${dData};${d.descricao};${d.categoria};${dValor}\n`;
    });

    const blob = new Blob([csvCompleto], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_financeiro_${mesSelecionado}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarParaPDF = () => {
    const popup = window.open('', '_blank', 'width=850,height=1000');
    if (!popup) return alert('Por favor, autorize pop-ups no seu navegador para emitir o PDF!');

    const dataEmissao = new Date().toLocaleString('pt-BR');

    const linhasTabela = despesasFiltradas.map((d: any) => {
      return `<tr><td>${new Date(d.data).toLocaleDateString('pt-BR')}</td><td><strong>${d.descricao}</strong></td><td>${d.categoria}</td><td class="right bold text-red">- ${formataMoeda(d.valor)}</td></tr>`;
    }).join('');

    popup.document.write(`
      <html>
        <head>
          <title>Relatório Financeiro</title>
          <style>
            @page { size: A4; margin: 15mm 12mm; } body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2d3748; margin: 0; padding: 0; font-size: 10.5pt; }
            .header { border-bottom: 3px solid #6A283A; padding-bottom: 12px; margin-bottom: 25px; display: table; width: 100%; } .header-left { display: table-cell; vertical-align: bottom; } .header-right { display: table-cell; text-align: right; vertical-align: bottom; font-size: 9pt; color: #718096; } .header-left h1 { color: #6A283A; margin: 0; font-size: 24pt; font-weight: 900; }
            
            .resumo-tabela { width: 100%; margin-bottom: 30px; border-collapse: separate; border-spacing: 15px 0; }
            .resumo-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background-color: #f8fafc; }
            .resumo-card h3 { margin: 0 0 5px 0; font-size: 9pt; color: #718096; text-transform: uppercase; }
            .resumo-card p { margin: 0; font-size: 16pt; font-weight: 900; }
            
            .text-blue { color: #2b6cb0; } .text-red { color: #c53030; } .text-green { color: #2f855a; }
            
            table.lista { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9.5pt; } 
            table.lista th { background: #6A283A; color: #ffffff; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 8pt; text-align: left; } 
            table.lista td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            .right { text-align: right; } .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>O MUNDO DOS PERFUMES</h1>
              <p style="margin: 5px 0 0 0; font-size: 12pt; font-weight: bold; color: #4a5568;">Relatório Gerencial Financeiro</p>
            </div>
            <div class="header-right">
              <p>Mês Base: <strong>${mesSelecionado.split('-').reverse().join('/')}</strong></p>
              <p>Data de Emissão: <strong>${dataEmissao}</strong></p>
            </div>
          </div>
          
          <table class="resumo-tabela">
            <tr>
              <td class="resumo-card" style="border-left: 4px solid #3182ce;">
                <h3>Faturamento (Entradas)</h3>
                <p class="text-blue">${formataMoeda(faturamentoMes)}</p>
              </td>
              <td class="resumo-card" style="border-left: 4px solid #e53e3e;">
                <h3>Despesas (Saídas)</h3>
                <p class="text-red">${formataMoeda(despesasMes)}</p>
              </td>
              <td class="resumo-card" style="border-left: 4px solid ${lucroMes >= 0 ? '#38a169' : '#e53e3e'};">
                <h3>Lucro Líquido do Mês</h3>
                <p class="${lucroMes >= 0 ? 'text-green' : 'text-red'}">${formataMoeda(lucroMes)}</p>
              </td>
            </tr>
          </table>

          <h3 style="color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">Detalhamento de Despesas (${mesSelecionado.split('-').reverse().join('/')})</h3>
          
          ${despesasFiltradas.length > 0 ? `
            <table class="lista">
              <thead><tr><th style="width: 15%;">Data</th><th style="width: 45%;">Descrição</th><th style="width: 25%;">Categoria</th><th style="width: 15%;" class="right">Valor</th></tr></thead>
              <tbody>${linhasTabela}</tbody>
            </table>
          ` : '<p style="color: #a0aec0; padding: 20px 0; text-align: center; font-style: italic;">Nenhuma despesa lançada neste mês de referência.</p>'}
        </body>
      </html>
    `);
    popup.document.close();
  };

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold animate-pulse">Carregando painel financeiro...</div>;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      {/* CABEÇALHO COM FILTRO DE MÊS */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h2 className="text-2xl font-black text-[#6A283A] flex items-center gap-2">📈 Controle Financeiro</h2>
          <p className="text-zinc-500 text-sm font-medium mt-1">Registe as suas despesas e descubra o seu Lucro Líquido real.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-[#E0DDDD] shadow-sm w-full md:w-auto">
          <span className="text-lg">📅</span>
          <input 
            type="month" 
            value={mesSelecionado} 
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="bg-transparent text-sm font-black text-[#6A283A] outline-none cursor-pointer w-full"
          />
        </div>
      </div>

      {/* CARDS RESUMO DO MÊS SELECIONADO */}
      <h3 className="text-lg font-black text-zinc-700">Resumo de {mesSelecionado.split('-').reverse().join('/')}</h3>
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

        {/* TABELA DE DESPESAS COM BOTÕES DE EXPORTAÇÃO */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-zinc-800">Histórico de Saídas ({mesSelecionado.split('-').reverse().join('/')})</h2>
            <div className="flex items-center gap-2">
              <button onClick={exportarParaExcel} className="bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm hover:bg-green-800 transition">📥 Excel</button>
              <button onClick={exportarParaPDF} className="bg-[#6A283A] text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm hover:bg-[#521e2d] transition">📄 PDF</button>
            </div>
          </div>
          
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
                {despesasFiltradas.map((despesa) => (
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
                {despesasFiltradas.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Nenhuma despesa registada neste mês.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}