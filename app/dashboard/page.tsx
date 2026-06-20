// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getDadosDashboard, cancelarVendaAction } from './dashboardActions';
import { getDadosFinanceiros } from './financeiro/actions'; 
import Link from 'next/link';

export default function DashboardPage() {
  const [dados, setDados] = useState<any>(null);
  const [listaDespesas, setListaDespesas] = useState<any[]>([]); 
  const [carregando, setCarregando] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarioNome, setUsuarioNome] = useState('');
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const res = await getDadosDashboard();
    setDados(res);
    setIsAdmin(res.isAdmin);
    setUsuarioNome(res.usuario?.nome || '');
    setLogs(res.logs || []);

    try {
      const fin = await getDadosFinanceiros();
      setListaDespesas(fin.listaDespesas || []);
    } catch (e) {
      console.error("Erro ao carregar dados financeiros no painel:", e);
    }

    setCarregando(false);
  }

  const handleEstornarVenda = async (idVenda: number) => {
    if(confirm('ATENÇÃO: Deseja realmente cancelar esta venda?\n\nO valor será subtraído do faturamento e os produtos voltarão automaticamente para o estoque.')) {
      await cancelarVendaAction(idVenda);
      alert('Venda estornada com sucesso!');
      carregar(); 
    }
  };

  // 🚀 ATUALIZADO: Extrai também a observação da divisão Múltipla
  const formatarPagamentoTabela = (pag: string) => {
    if (!pag) return 'DINHEIRO';
    const pLow = pag.toLowerCase();
    if (pLow === 'credito') return 'CRÉDITO 💳';
    if (pLow === 'debito') return 'DÉBITO 💳';
    
    // Tratamento para Venda Múltipla
    if (pLow.startsWith('multiplo:')) {
      if (pag.includes('obs=')) {
        const match = pag.match(/obs=([^;]+)/);
        const obsExtraida = match ? match[1] : '';
        return obsExtraida ? `MÚLTIPLO 🔀 (${obsExtraida})` : 'MÚLTIPLO 🔀';
      }
      return 'MÚLTIPLO 🔀';
    }
    
    // Tratamento para Venda Direta
    if (pLow.startsWith('venda_direta')) {
      if (pag.includes(':obs=')) {
        const obsExtraida = pag.split(':obs=')[1];
        return `VENDA DIRETA 📝 (${obsExtraida})`;
      }
      return 'VENDA DIRETA 📝';
    }
    
    return pag.toUpperCase();
  };

  const formataMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const exportarParaExcel = () => {
    if (!dados || !dados.listaVendas || dados.listaVendas.length === 0) return;

    const vendasValidasRelatorio = dados.listaVendas.filter((v: any) => v.status !== 'cancelada');
    const totalRelatorio = vendasValidasRelatorio.reduce((acc: number, v: any) => acc + v.total, 0);
    const dataEmissao = new Date().toLocaleString('pt-BR');
    
    let csvCompleto = "\uFEFF"; 
    csvCompleto += "O MUNDO DOS PERFUMES\n";
    csvCompleto += `RELATÓRIO GERENCIAL DE VENDAS\n`;
    csvCompleto += `Data de Emissão: ${dataEmissao}\n\n`;
    csvCompleto += "Código do Cupom;Data e Hora;Forma de Pagamento;Status da Venda;Valor da Venda (R$)\n";

    dados.listaVendas.forEach((v: any) => {
      const idCupom = `#${v.id}`;
      const dataHora = new Date(v.data).toLocaleString('pt-BR');
      const pagamentoStr = v.formaPagamento ? v.formaPagamento.toUpperCase() : 'DINHEIRO';
      const statusStr = v.status === 'cancelada' ? 'CANCELADA' : 'CONCLUÍDA';
      const valorStr = v.total.toFixed(2).replace('.', ',');

      csvCompleto += `${idCupom};${dataHora};${pagamentoStr};${statusStr};${valorStr}\n`;
    });

    csvCompleto += `\n;;;TOTAL FATURADO LÍQUIDO:;${totalRelatorio.toFixed(2).replace('.', ',')}\n`;

    const blob = new Blob([csvCompleto], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_vendas_mundo_perfumes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarParaPDF = () => {
    if (!dados || !dados.listaVendas || dados.listaVendas.length === 0) return;

    const popup = window.open('', '_blank', 'width=850,height=1000');
    if (!popup) return alert('Por favor, autorize pop-ups no seu navegador para emitir o PDF!');

    const vendasValidasRelatorio = dados.listaVendas.filter((v: any) => v.status !== 'cancelada');
    const totalRelatorio = vendasValidasRelatorio.reduce((acc: number, v: any) => acc + v.total, 0);
    const totalCancelado = dados.listaVendas.filter((v: any) => v.status === 'cancelada').reduce((acc: number, v: any) => acc + v.total, 0);
    const dataEmissao = new Date().toLocaleString('pt-BR');

    const linhasTabela = dados.listaVendas.map((v: any) => {
      const statusClasse = v.status === 'cancelada' ? 'status-cancelada' : 'status-concluida';
      const statusTexto = v.status === 'cancelada' ? 'CANCELADA' : 'CONCLUÍDA';
      const valorClasse = v.status === 'cancelada' ? 'valor-cancelado' : 'valor-concluido';
      return `
        <tr class="${v.status === 'cancelada' ? 'linha-cancelada' : ''}">
          <td><strong>#${v.id}</strong></td>
          <td>${new Date(v.data).toLocaleString('pt-BR')}</td>
          <td>${formatarPagamentoTabela(v.formaPagamento)}</td>
          <td><span class="status-badge ${statusClasse}">${statusTexto}</span></td>
          <td class="right bold ${valorClasse}">${formataMoeda(v.total)}</td>
        </tr>
      `;
    }).join('');

    popup.document.write(`
      <html>
        <head>
          <title>Relatório de Vendas - O Mundo dos Perfumes</title>
          <style>
            @page { size: A4; margin: 15mm 12mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2d3748; margin: 0; padding: 0; font-size: 10.5pt; line-height: 1.5; background-color: #ffffff; }
            
            .header { border-bottom: 3px solid #6A283A; padding-bottom: 12px; margin-bottom: 25px; display: table; width: 100%; }
            .header-left { display: table-cell; vertical-align: bottom; }
            .header-right { display: table-cell; text-align: right; vertical-align: bottom; font-size: 9pt; color: #718096; line-height: 1.3; }
            .header-left h1 { color: #6A283A; margin: 0; font-size: 24pt; font-weight: 900; letter-spacing: -0.5px; }
            .header-left p { margin: 4px 0 0 0; color: #4a5568; font-size: 11pt; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
            
            .cards-container { display: table; width: 100%; margin-bottom: 25px; border-collapse: separate; border-spacing: 10px 0; margin-left: -10px; margin-right: -10px; }
            .card { display: table-cell; width: 33.33%; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; box-sizing: border-box; }
            .card.primary { border-left: 4px solid #6A283A; background: #fdf6f6; }
            .card.danger { border-left: 4px solid #e53e3e; background: #fff5f5; }
            .card-title { font-size: 8pt; text-transform: uppercase; color: #718096; font-weight: 800; letter-spacing: 0.5px; }
            .card-value { font-size: 16pt; font-weight: 900; color: #2d3748; margin-top: 5px; }
            .card.primary .card-value { color: #6A283A; }
            .card.danger .card-value { color: #c53030; }

            table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9.5pt; }
            th { background: #6A283A; color: #ffffff; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px; text-align: left; }
            th.right { text-align: right; }
            td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748; vertical-align: middle; }
            tr:nth-child(even) { background: #f7fafc; }
            .linha-cancelada { background: #fff5f5 !important; }
            
            .status-badge { display: inline-block; padding: 3px 8px; font-size: 7.5pt; font-weight: 800; border-radius: 4px; text-transform: uppercase; }
            .status-concluida { background-color: #c6f6d5; color: #22543d; }
            .status-cancelada { background-color: #fed7d7; color: #742a2a; }
            
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .valor-concluido { color: #22543d; }
            .valor-cancelado { color: #742a2a; text-decoration: line-through; opacity: 0.6; }
            
            .total-row { background: #fdf6f6 !important; font-size: 11pt; }
            .total-row td { border-top: 2px solid #6A283A; border-bottom: 2px solid #6A283A; color: #6A283A; padding: 14px 12px; }
            
            .footer { position: fixed; bottom: 0; left: 0; width: 100%; text-align: center; font-size: 8pt; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>O MUNDO DOS PERFUMES</h1>
              <p>Histórico Geral de Auditoria</p>
            </div>
            <div class="header-right">
              <p>Data de Emissão: <strong>${dataEmissao}</strong></p>
              <p>Responsável: <strong>${usuarioNome.toUpperCase()}</strong></p>
            </div>
          </div>

          <div class="cards-container">
            <div class="card primary">
              <div class="card-title">Faturamento Líquido</div>
              <div class="card-value">${formataMoeda(totalRelatorio)}</div>
            </div>
            <div class="card">
              <div class="card-title">Movimentações Ativas</div>
              <div class="card-value">${vendasValidasRelatorio.length} vendas</div>
            </div>
            <div class="card danger">
              <div class="card-title">Montante Cancelado</div>
              <div class="card-value">${formataMoeda(totalCancelado)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 12%;">Cupom</th>
                <th style="width: 25%;">Data e Hora</th>
                <th style="width: 33%;">Forma de Pagamento</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 15%;" class="right">Valor Líquido</th>
              </tr>
            </thead>
            <tbody>
              ${linhasTabela}
              <tr class="total-row bold">
                <td colspan="3"></td>
                <td>TOTAL LÍQUIDO:</td>
                <td class="right">${formataMoeda(totalRelatorio)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            Relatório Gerencial Oficial de Auditoria Interna - O Mundo dos Perfumes. Documento confidencial.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 800);
            }
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold animate-pulse">Carregando Painel Geral...</div>;

  if (!isAdmin) {
    return (
      <div className="bg-gradient-to-br from-[#6A283A] to-[#521e2d] text-white p-6 md:p-10 rounded-2xl border border-[#521e2d] shadow-2xl flex flex-col items-center justify-center text-center gap-6 animate-in fade-in zoom-in-95 mt-10 max-w-2xl mx-auto">
        <div className="text-6xl mb-2">🛍️</div>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-[#EED9D4]">Olá, {usuarioNome}!</h2>
        <p className="text-[#EED9D4]/80 text-base font-medium max-w-md leading-relaxed">Seu caixa está liberado para iniciar os atendimentos. Clique no botão abaixo para começar a registrar as vendas do dia.</p>
        <Link href="/dashboard/caixa" className="w-full md:w-auto bg-[#EED9D4] text-[#6A283A] font-black py-4 px-10 rounded-xl hover:bg-white transition-all uppercase tracking-wider shadow-lg active:scale-95 mt-4">🛒 Abrir o Caixa (PDV)</Link>
      </div>
    );
  }

  const listaVendas = dados?.listaVendas || [];
  const listaProdutos = dados?.listaProdutos || [];
  const listaClientes = dados?.listaClientes || [];
  const listaItens = dados?.listaItens || [];

  const dataHoje = new Date().toISOString().split('T')[0];
  const mesAtual = new Date().toISOString().slice(0, 7);
  
  const vendasValidas = listaVendas.filter((v: any) => v.status !== 'cancelada');
  const vendasHoje = vendasValidas.filter((v: any) => v.data && v.data.startsWith(dataHoje));
  const vendasMes = vendasValidas.filter((v: any) => v.data && v.data.startsWith(mesAtual));

  const totalVendidoHoje = vendasHoje.reduce((acc: number, v: any) => acc + v.total, 0);
  const totalVendidoMes = vendasMes.reduce((acc: number, v: any) => acc + v.total, 0);
  const totalVendidoSempre = vendasValidas.reduce((acc: number, v: any) => acc + v.total, 0);
  
  const produtosBaixoEstoque = listaProdutos.filter((p: any) => p.estoque > 0 && p.estoque <= 5);
  const produtosSemEstoque = listaProdutos.filter((p: any) => p.estoque === 0);

  const obterPagamento = (v: any) => (v.formaPagamento || '').toLowerCase();

  const hojePix = vendasHoje.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'pix', v.total), 0);
  const hojeCredito = vendasHoje.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'credito', v.total), 0);
  const hojeDebito = vendasHoje.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'debito', v.total), 0);
  const hojeDinheiro = vendasHoje.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'dinheiro', v.total), 0);

  const mesPix = vendasMes.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'pix', v.total), 0);
  const mesCredito = vendasMes.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'credito', v.total), 0);
  const mesDebito = vendasMes.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'debito', v.total), 0);
  const mesDinheiro = vendasMes.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'dinheiro', v.total), 0);

  const hojeVendaDireta = vendasHoje.filter((v: any) => obterPagamento(v).startsWith('venda_direta')).reduce((acc: number, v: any) => acc + v.total, 0);
  const mesVendaDireta = vendasMes.filter((v: any) => obterPagamento(v).startsWith('venda_direta')).reduce((acc: number, v: any) => acc + v.total, 0);
  const totalVendaDiretaSempre = vendasValidas.filter((v: any) => obterPagamento(v).startsWith('venda_direta')).reduce((acc: number, v: any) => acc + v.total, 0);

  function obterValorPorForma(forma: string, tipo: string, totalVenda: number) {
    if (!forma) return 0;
    const f = forma.toLowerCase();
    if (f.startsWith('multiplo:')) {
      const partes = f.replace('multiplo:', '').split(';');
      for (const p of partes) {
        const [k, v] = p.split('=');
        // A proteção com Number resolve a ignorar o obs na hora da soma financeira
        if (k === tipo || (tipo === 'credito' && k === 'cartao')) return Number(v) || 0;
      }
      return 0;
    }
    if (f === tipo) return totalVenda;
    if (tipo === 'credito' && f === 'cartao') return totalVenda;
    return 0;
  }

  const idsVendasValidas = new Set(vendasValidas.map((v: any) => v.id));
  const idsVendasMes = new Set(vendasMes.map((v: any) => v.id));
  
  const custoProdutoMap = new Map<number, number>(
    listaProdutos.map((p: any) => [Number(p.id), Number(p.precoCusto || 0)])
  );

  let custoMercadoriaTotal = 0;
  let custoMercadoriaMes = 0;
  const vendasPorProduto: Record<number, number> = {};
  
  listaItens.forEach((item: any) => {
    if (idsVendasValidas.has(item.idVenda)) {
      const itemId = Number(item.idProduto);
      const itemQtd = Number(item.quantidade || 0);

      vendasPorProduto[itemId] = (vendasPorProduto[itemId] || 0) + itemQtd;
      
      const custoUnitario = Number(custoProdutoMap.get(itemId) || 0);
      
      custoMercadoriaTotal += (custoUnitario * itemQtd);

      if (idsVendasMes.has(item.idVenda)) {
        custoMercadoriaMes += (custoUnitario * itemQtd);
      }
    }
  });

  const produtosMaisVendidos = listaProdutos
    .map((p: any) => ({ ...p, qtdVendida: vendasPorProduto[p.id] || 0 }))
    .sort((a: any, b: any) => b.qtdVendida - a.qtdVendida);

  const topProduto = produtosMaisVendidos.length > 0 && produtosMaisVendidos[0].qtdVendida > 0 ? produtosMaisVendidos[0] : null;
  const totalProdutosCadastrados = listaProdutos.length;
  
  const valorPotencialAlcancado = listaProdutos.reduce((acc: number, p: any) => acc + (Number(p.precoVenda || 0) * Number(p.estoque || 0)), 0);
  const capitalInvestidoEstoque = listaProdutos.reduce((acc: number, p: any) => acc + (Number(p.precoCusto || 0) * (p.estoque > 0 ? Number(p.estoque) : 0)), 0);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      <div className="bg-gradient-to-r from-[#EED9D4]/40 to-white p-5 rounded-2xl border border-[#6A283A]/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-md">
        <div className="bg-[#6A283A] p-3 rounded-full animate-bounce shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl">🛡️</span>
        </div>
        <div>
          <h3 className="font-black text-[#6A283A] text-lg uppercase tracking-wide">Bem-vindo, {usuarioNome}!</h3>
          <p className="text-zinc-600 text-sm mt-1 font-medium leading-relaxed">Controle total ativado. Seu relatório rastreia faturamento de estoque, <strong>PIX, Crédito, Débito, Dinheiro</strong> e os <strong>Logs de Segurança</strong>.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-[#6A283A] flex flex-col justify-between">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Vendas de Hoje</h3>
            <p className="text-2xl font-black text-[#6A283A] mt-2">{formataMoeda(totalVendidoHoje)}</p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-500 text-center">
            <div className="bg-zinc-50 p-1.5 rounded">💵 {formataMoeda(hojeDinheiro)}</div>
            <div className="bg-zinc-50 p-1.5 rounded">💠 {formataMoeda(hojePix)}</div>
            <div className="bg-blue-50 text-blue-700 p-1.5 rounded">💳 CR: {formataMoeda(hojeCredito)}</div>
            <div className="bg-teal-50 text-teal-700 p-1.5 rounded">💳 DB: {formataMoeda(hojeDebito)}</div>
            <div className="bg-purple-50 text-purple-700 p-1.5 rounded col-span-2">📝 DIRETA: {formataMoeda(hojeVendaDireta)}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-[#A56877] flex flex-col justify-between">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Faturamento do Mês</h3>
            <p className="text-2xl font-black text-[#A56877] mt-2">{formataMoeda(totalVendidoMes)}</p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-500 text-center">
            <div className="bg-zinc-50 p-1.5 rounded">💵 {formataMoeda(mesDinheiro)}</div>
            <div className="bg-zinc-50 p-1.5 rounded">💠 {formataMoeda(mesPix)}</div>
            <div className="bg-blue-50 text-blue-700 p-1.5 rounded">💳 CR: {formataMoeda(mesCredito)}</div>
            <div className="bg-teal-50 text-teal-700 p-1.5 rounded">💳 DB: {formataMoeda(mesDebito)}</div>
            <div className="bg-purple-50 text-purple-700 p-1.5 rounded col-span-2">📝 DIRETA: {formataMoeda(mesVendaDireta)}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-purple-600 transition-transform hover:scale-105 flex flex-col justify-between">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Total Venda Direta (Histórico)</h3>
            <p className="text-2xl font-black text-purple-600 mt-2">{formataMoeda(totalVendaDiretaSempre)}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Controle de carteira de clientes fixos</p>
          </div>
          <div className="mt-4 pt-2 border-t border-zinc-100 text-xs text-zinc-500 font-bold flex justify-between">
            <span>Balcão Loja:</span>
            <span className="text-zinc-800">{formataMoeda(totalVendidoSempre - totalVendaDiretaSempre)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-orange-500 transition-transform hover:scale-105 flex flex-col justify-between">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Custos c/ Mercadoria (Mês)</h3>
            <p className="text-2xl font-black text-orange-600 mt-2">{formataMoeda(custoMercadoriaMes)}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Preço de custo dos itens vendidos</p>
          </div>
          <p className="text-xs text-zinc-400 mt-4 pt-2 border-t border-zinc-100">Custo Histórico Total: <strong>{formataMoeda(custoMercadoriaTotal)}</strong></p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-blue-600 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">📦 Cadastrados</h3>
          <p className="text-2xl font-black text-zinc-800 mt-2">{totalProdutosCadastrados}</p>
          <p className="text-xs text-zinc-400 mt-2">Tipos de produtos na loja</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-emerald-500 transition-transform hover:scale-105 flex flex-col justify-between">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">💰 Meta em Estoque</h3>
            <p className="text-2xl font-black text-emerald-600 mt-2">{formataMoeda(valorPotencialAlcancado)}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Valor financeiro de venda a realizar</p>
          </div>
          <p className="text-xs text-zinc-400 mt-4 pt-2 border-t border-zinc-100">Capital Investido Atual: <strong>{formataMoeda(capitalInvestidoEstoque)}</strong></p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-zinc-800 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Mais Vendido 🏆</h3>
          <p className="text-lg font-black text-zinc-800 mt-2 truncate" title={topProduto ? topProduto.nome : 'Nenhum'}>
            {topProduto ? topProduto.nome : 'Nenhuma venda'}
          </p>
          <p className="text-xs text-zinc-400 mt-2">{topProduto ? `${topProduto.qtdVendida} un. vendidas` : 'Aguardando dados'}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-green-600 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Faturamento Total</h3>
          <p className="text-2xl font-black text-green-600 mt-2">{formataMoeda(totalVendidoSempre)}</p>
          <p className="text-xs text-zinc-400 mt-2">Líquido de cancelamentos</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-indigo-500 transition-transform hover:scale-105">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Total de Clientes</h3>
          <p className="text-2xl font-black text-zinc-800 mt-2">{listaClientes.length}</p>
          <p className="text-xs text-zinc-400 mt-2">Na base de dados</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-red-200 border-l-4 border-l-red-500 transition-transform hover:scale-105 col-span-1 sm:col-span-2 lg:col-span-1">
          <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Alerta de Estoque</h3>
          <p className="text-2xl font-black text-red-600 mt-2">{produtosSemEstoque.length} <span className="text-lg">zerados</span></p>
          <p className="text-xs text-red-400 font-medium mt-2">{produtosBaixoEstoque.length} produto(s) acabando</p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#6A283A]">Histórico de Vendas</h2>
              <p className="text-xs font-semibold text-zinc-500 mt-0.5">
                Total Geral Acumulado: <span className="text-green-600 font-black">{formataMoeda(totalVendidoSempre)}</span>
              </p>
            </div>
            
            {listaVendas.length > 0 && (
              <div className="flex items-center gap-2">
                <button onClick={exportarParaExcel} className="bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-green-800 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm uppercase tracking-wider">
                  📥 Excel
                </button>
                <button onClick={exportarParaPDF} className="bg-[#6A283A] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#521e2d] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm uppercase tracking-wider">
                  📄 PDF
                </button>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60 flex-1 max-h-[480px] overflow-y-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-zinc-50 sticky top-0 border-b border-[#E0DDDD] z-10">
                <tr>
                  <th className="p-3 text-xs font-bold text-zinc-600 bg-zinc-50">Data</th>
                  <th className="p-3 text-xs font-bold text-zinc-600 bg-zinc-50">Valor</th>
                  <th className="p-3 text-xs font-bold text-zinc-600 bg-zinc-50">Pagamento</th>
                  <th className="p-3 text-xs font-bold text-zinc-600 bg-zinc-50">Status</th>
                  <th className="p-3 text-xs font-bold text-zinc-600 text-right bg-zinc-50">Ação</th>
                </tr>
              </thead>
              <tbody>
                {listaVendas.map((venda: any) => (
                  <tr key={venda.id} className={`border-b border-[#E0DDDD]/50 transition-colors ${venda.status === 'cancelada' ? 'bg-red-50/50' : 'hover:bg-[#EED9D4]/20'}`}>
                    <td className="p-3 text-sm text-zinc-600">{new Date(venda.data).toLocaleString('pt-BR')}</td>
                    <td className={`p-3 text-sm font-black ${venda.status === 'cancelada' ? 'text-zinc-400 line-through' : 'text-green-600'}`}>
                      {formataMoeda(venda.total)}
                    </td>
                    <td className="p-3 text-xs font-bold text-zinc-500 uppercase">{formatarPagamentoTabela(venda.formaPagamento)}</td>
                    <td className="p-3">
                      {venda.status === 'cancelada' ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-black uppercase">Cancelada</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-black uppercase">Concluída</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {venda.status !== 'cancelada' && (
                        <button onClick={() => handleEstornarVenda(venda.id)} className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-600 hover:text-white transition-colors font-bold shadow-sm">Estornar</button>
                      )}
                    </td>
                  </tr>
                ))}
                {listaVendas.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-zinc-500 text-sm">Nenhuma venda registrada ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] flex flex-col">
          <h2 className="text-xl font-bold text-[#6A283A] mb-4">Esgotados</h2>
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60 flex-1">
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
                    <td className="p-3 text-sm font-bold text-zinc-800 line-clamp-1" title={produto.nome}>{produto.nome}</td>
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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
          <h2 className="text-xl font-black text-[#6A283A] flex items-center gap-2">
            <span>📜</span> Histórico de Segurança (Logs)
          </h2>
          <span className="text-xs font-bold bg-zinc-100 text-zinc-600 px-3 py-1 rounded-md uppercase tracking-wider">Monitoramento em Tempo Real</span>
        </div>

        <div className="divide-y divide-zinc-100 max-h-[300px] overflow-y-auto pr-2 space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm hover:bg-zinc-50/50 px-2 rounded-lg transition-colors">
              <div className="flex items-start gap-3">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider mt-0.5 flex-shrink-0 ${
                  log.categoria === 'venda' ? 'bg-green-100 text-green-800 border border-green-200' :
                  log.categoria === 'caixa' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  log.categoria === 'produto' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}>
                  {log.categoria}
                </span>
                <div>
                  <p className="text-zinc-700 font-semibold leading-relaxed">{log.descricao}</p>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mt-1">👤 Autor da ação: {log.usuarioNome}</p>
                </div>
              </div>
              <span className="text-xs text-zinc-400 font-mono sm:text-right whitespace-nowrap">{new Date(log.data).toLocaleString('pt-BR')}</span>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="p-8 text-center bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
              <div className="text-3xl opacity-40 mb-2">📭</div>
              <p className="text-zinc-400 font-medium text-sm">Nenhuma atividade registrada no histórico de auditoria.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}