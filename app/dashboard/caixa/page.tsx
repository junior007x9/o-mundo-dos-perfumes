// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getDadosDashboard, cancelarVendaAction, quitarVendaAction, atualizarNotaReceberAction } from './dashboardActions';
import { getDadosFinanceiros } from './financeiro/actions'; 
import Link from 'next/link';

export default function DashboardPage() {
  const [dados, setDados] = useState<any>(null);
  const [listaDespesas, setListaDespesas] = useState<any[]>([]); 
  const [carregando, setCarregando] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarioNome, setUsuarioNome] = useState('');
  const [logs, setLogs] = useState<any[]>([]);

  // 🚀 Controle das abas gerenciais (Agora com o Passo 5)
  const [abaAtiva, setAbaAtiva] = useState('geral');
  
  // 🚀 Estados para o Passo 5 (Metas e Comissões)
  const [metaLoja, setMetaLoja] = useState<number>(50000); // Ex: Meta de 50 mil reais
  const [taxaComissao, setTaxaComissao] = useState<number>(5); // Ex: 5% de comissão

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

  const handleQuitarConta = async (idVenda: number, nomeCliente: string) => {
    if (confirm(`Confirmar liquidação total para ${nomeCliente}?\n\nO valor sairá da lista de pendentes e será marcado como recebido.`)) {
      await quitarVendaAction(idVenda);
      alert('Conta baixada com sucesso! 🎉');
      carregar();
    }
  };

  const handleAlterarNota = async (idVenda: number, notaAtual: string) => {
    const novaNota = prompt("Atualize o histórico do pagamento (Ex: Pagou R$100, faltam 2x):", notaAtual);
    if (novaNota !== null) {
      await atualizarNotaReceberAction(idVenda, novaNota);
      alert('Histórico atualizado!');
      carregar();
    }
  };

  const formatarPagamentoTabela = (pag: string) => {
    if (!pag) return 'DINHEIRO';
    const pLow = pag.toLowerCase();
    if (pLow === 'credito') return 'CRÉDITO 💳';
    if (pLow === 'debito') return 'DÉBITO 💳';
    
    if (pLow.startsWith('multiplo:')) {
      if (pag.includes('obs=')) {
        const match = pag.match(/obs=([^;]+)/);
        const obsExtraida = match ? match[1] : '';
        const limpaObs = obsExtraida.replace(';pago=true', '').replace('pago=true', '');
        return limpaObs ? `MÚLTIPLO 🔀 (${limpaObs})` : 'MÚLTIPLO 🔀';
      }
      return 'MÚLTIPLO 🔀';
    }
    
    if (pLow.startsWith('venda_direta')) {
      if (pag.includes(':obs=')) {
        const obsExtraida = pag.split(':obs=')[1];
        const limpaObs = obsExtraida.replace(';pago=true', '').replace('pago=true', '');
        return `VENDA DIRETA 📝 (${limpaObs})`;
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
            table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9.5pt; }
            th { background: #6A283A; color: #ffffff; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px; text-align: left; }
            td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748; vertical-align: middle; }
            tr:nth-child(even) { background: #f7fafc; }
            .status-badge { display: inline-block; padding: 3px 8px; font-size: 7.5pt; font-weight: 800; border-radius: 4px; text-transform: uppercase; }
            .status-concluida { background-color: #c6f6d5; color: #22543d; }
            .status-cancelada { background-color: #fed7d7; color: #742a2a; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .total-row { background: #fdf6f6 !important; font-size: 11pt; }
            .total-row td { border-top: 2px solid #6A283A; border-bottom: 2px solid #6A283A; color: #6A283A; padding: 14px 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left"><h1>O MUNDO DOS PERFUMES</h1><p>Histórico Geral de Auditoria</p></div>
            <div class="header-right"><p>Data de Emissão: <strong>${dataEmissao}</strong></p></div>
          </div>
          <table>
            <thead><tr><th style="width: 12%;">Cupom</th><th style="width: 25%;">Data e Hora</th><th style="width: 33%;">Forma de Pagamento</th><th style="width: 15%;">Status</th><th style="width: 15%;" class="right">Valor Líquido</th></tr></thead>
            <tbody>${linhasTabela}<tr class="total-row bold"><td colspan="3"></td><td>TOTAL LÍQUIDO:</td><td class="right">${formataMoeda(totalRelatorio)}</td></tr></tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const dispararImpressaoEtiqueta = (produto: any) => {
    const popup = window.open('', '_blank', 'width=400,height=400');
    if (!popup) return alert('Por favor, autorize pop-ups para gerar a etiqueta!');
    popup.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; padding: 15px; text-align: center; color: #000; }
            .box { border: 2px dashed #000; padding: 12px; border-radius: 6px; max-width: 250px; margin: 0 auto; }
            .brand { font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #555; }
            .title { font-size: 11pt; font-weight: bold; margin: 6px 0; height: 32px; overflow: hidden; }
            .price { font-size: 16pt; font-weight: 900; margin: 6px 0; }
            .bar { background: #000; height: 30px; width: 100%; margin: 6px auto; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 6pt; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="brand">${produto.marca || 'O MUNDO DOS PERFUMES'}</div>
            <div class="title">${produto.nome}</div>
            <div class="price">${formataMoeda(produto.precoVenda)}</div>
            <div class="bar">|||||||||||||||||||||||||||||||</div>
            <div style="font-size: 8pt; font-weight: bold;">${produto.codigoBarras || 'SEM CÓDIGO'}</div>
          </div>
          <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 600); }</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold animate-pulse">Carregando Painel Geral...</div>;

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

  const obterPagamento = (v: any) => String(v.formaPagamento || '').toLowerCase();

  const hojeDinheiro = vendasHoje.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'dinheiro', v.total), 0);
  const hojePix = vendasHoje.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'pix', v.total), 0);
  const hojeCredito = vendasHoje.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'credito', v.total), 0);
  const hojeDebito = vendasHoje.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'debito', v.total), 0);

  const mesDinheiro = vendasMes.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'dinheiro', v.total), 0);
  const mesPix = vendasMes.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'pix', v.total), 0);
  const mesCredito = vendasMes.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'credito', v.total), 0);
  const mesDebito = vendasMes.reduce((acc: number, v: any) => acc + obterValorPorForma(v.formaPagamento, 'debito', v.total), 0);

  const hojeVendaDireta = vendasHoje.filter((v: any) => obterPagamento(v).startsWith('venda_direta') && !obterPagamento(v).includes('pago=true')).reduce((acc: number, v: any) => acc + v.total, 0);
  const mesVendaDireta = vendasMes.filter((v: any) => obterPagamento(v).startsWith('venda_direta') && !obterPagamento(v).includes('pago=true')).reduce((acc: number, v: any) => acc + v.total, 0);
  const totalVendaDiretaSempre = vendasValidas.filter((v: any) => obterPagamento(v).startsWith('venda_direta') && !obterPagamento(v).includes('pago=true')).reduce((acc: number, v: any) => acc + v.total, 0);

  function obterValorPorForma(forma: string, tipo: string, totalVenda: number) {
    if (!forma) return 0;
    const f = String(forma).toLowerCase();
    if (f.startsWith('multiplo:')) {
      const partes = f.replace('multiplo:', '').split(';');
      for (const p of partes) {
        const [k, v] = p.split('=');
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

  const despesasOperacionaisMes = listaDespesas
    .filter((d: any) => d.categoria !== 'Estoque / Mercadoria' && d.data && d.data.startsWith(mesAtual))
    .reduce((acc: number, d: any) => acc + Number(d.valor || 0), 0);

  const despesasOperacionaisTotal = listaDespesas
    .filter((d: any) => d.categoria !== 'Estoque / Mercadoria')
    .reduce((acc: number, d: any) => acc + Number(d.valor || 0), 0);

  const clienteNomeMap = new Map<number, string>(
    listaClientes.map((c: any) => [Number(c.id), String(c.nome || 'Consumidor Fixo')])
  );

  // 🚀 LÓGICA DO PASSO 5: Agrupamento de Vendas por Vendedor (Comissões)
  const vendasPorVendedor = vendasMes.reduce((acc: any, v: any) => {
    // Se não houver idVendedor registrado, consideramos como "Caixa Loja (Sede)"
    const id = v.idVendedor ? String(v.idVendedor) : 'Loja Principal';
    acc[id] = (acc[id] || 0) + Number(v.total || 0);
    return acc;
  }, {});

  const progressoMeta = Math.min((totalVendidoMes / metaLoja) * 100, 100);

  if (!isAdmin) {
    return (
      <div className="bg-gradient-to-br from-[#6A283A] to-[#521e2d] text-white p-6 md:p-10 rounded-2xl text-center mt-10 max-w-2xl mx-auto">
        <h2 className="text-2xl font-black uppercase text-[#EED9D4]">Olá, {usuarioNome}!</h2>
        <p className="mt-2 text-zinc-200">Suas vendas deste mês: <strong>{formataMoeda(vendasPorVendedor[String(dados?.idVendedorLogado)] || 0)}</strong></p>
        <Link href="/dashboard/caixa" className="inline-block bg-[#EED9D4] text-[#6A283A] font-black py-4 px-10 rounded-xl mt-4">🛒 Abrir o Caixa (PDV)</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      <div className="bg-gradient-to-r from-[#EED9D4]/40 to-white p-5 rounded-2xl border border-[#6A283A]/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#6A283A] p-3 rounded-full shadow-lg border-2 border-white text-white">🛡️</div>
          <div>
            <h3 className="font-black text-[#6A283A] text-lg uppercase tracking-wide">Módulo de Governança Avançada</h3>
            <p className="text-zinc-600 text-sm mt-0.5 font-medium">Controle automatizado de carteira, P&L estruturado, fluxo de mercadoria e rotulagem.</p>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 border-b border-zinc-200 pb-px scrollbar-none">
        <button onClick={() => setAbaAtiva('geral')} className={`px-5 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'geral' ? 'border-[#6A283A] text-[#6A283A]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
          📊 Painel Geral
        </button>
        <button onClick={() => setAbaAtiva('receber')} className={`px-5 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'receber' ? 'border-purple-600 text-purple-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
          📝 1: A Receber
        </button>
        <button onClick={() => setAbaAtiva('dre')} className={`px-5 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'dre' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
          🧮 2: DRE Gerencial
        </button>
        <button onClick={() => setAbaAtiva('giro')} className={`px-5 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'giro' ? 'border-orange-500 text-orange-500' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
          📦 3: Giro de Estoque
        </button>
        <button onClick={() => setAbaAtiva('etiquetas')} className={`px-5 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'etiquetas' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
          🏷️ 4: Etiquetas
        </button>
        {/* NOVO BOTÃO DO PASSO 5 */}
        <button onClick={() => setAbaAtiva('comissoes')} className={`px-5 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'comissoes' ? 'border-amber-500 text-amber-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
          🎖️ 5: Metas & Comissões
        </button>
      </div>

      {abaAtiva === 'geral' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* O conteúdo da Aba Geral mantém-se inalterado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-[#6A283A] flex flex-col justify-between">
              <div>
                <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Vendas de Hoje</h3>
                <p className="text-2xl font-black text-[#6A283A] mt-2">{formataMoeda(totalVendidoHoje)}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-[#A56877] flex flex-col justify-between">
              <div>
                <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Faturamento do Mês</h3>
                <p className="text-2xl font-black text-[#A56877] mt-2">{formataMoeda(totalVendidoMes)}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-purple-600 flex flex-col justify-between">
              <div>
                <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Total Venda Direta</h3>
                <p className="text-2xl font-black text-purple-600 mt-2">{formataMoeda(totalVendaDiretaSempre)}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-orange-500 flex flex-col justify-between">
              <div>
                <h3 className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-wider">Custos c/ Mercadoria</h3>
                <p className="text-2xl font-black text-orange-600 mt-2">{formataMoeda(custoMercadoriaMes)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
            <h2 className="text-xl font-bold text-[#6A283A] mb-4">Histórico de Vendas</h2>
            <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60 flex-1 max-h-[400px]">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-zinc-50 sticky top-0 border-b border-[#E0DDDD] z-10">
                  <tr>
                    <th className="p-3 text-xs font-bold text-zinc-600">Data</th>
                    <th className="p-3 text-xs font-bold text-zinc-600">Valor</th>
                    <th className="p-3 text-xs font-bold text-zinc-600">Pagamento</th>
                    <th className="p-3 text-xs font-bold text-zinc-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {listaVendas.map((venda: any) => (
                    <tr key={venda.id} className="border-b border-[#E0DDDD]/50">
                      <td className="p-3 text-sm text-zinc-600">{new Date(venda.data).toLocaleString('pt-BR')}</td>
                      <td className="p-3 text-sm font-black text-green-600">{formataMoeda(venda.total)}</td>
                      <td className="p-3 text-xs font-bold text-zinc-500 uppercase">{formatarPagamentoTabela(venda.formaPagamento)}</td>
                      <td className="p-3"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-black uppercase">Concluída</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'receber' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300">
          <div className="mb-4">
            <h2 className="text-xl font-black text-purple-700">📑 Monitoramento Dinâmico de Contas a Receber</h2>
            <p className="text-zinc-500 text-sm mt-0.5">Clique para dar baixa total, registrar amortizações e conferir notas fiscais.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-purple-50 border-b border-purple-200">
                <tr>
                  <th className="p-3 text-xs font-bold text-purple-900">Data</th>
                  <th className="p-3 text-xs font-bold text-purple-900">Cliente Responsável</th>
                  <th className="p-3 text-xs font-bold text-purple-900">Nota de Conferência (Interna)</th>
                  <th className="p-3 text-xs font-bold text-purple-900">Montante Devedor</th>
                  <th className="p-3 text-xs font-bold text-purple-900 text-center">Ações de Cobrança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-semibold text-sm">
                {listaVendas
                  .filter((v: any) => v.status !== 'cancelada' && (obterPagamento(v).startsWith('venda_direta') || obterPagamento(v).includes('obs=')))
                  .map((venda: any) => {
                    let notaInterna = 'Nota Geral de Balcão';
                    if (venda.formaPagamento.includes('obs=')) {
                      const match = venda.formaPagamento.match(/obs=([^;]+)/);
                      notaInterna = match ? match[1] : notaInterna;
                    } else if (venda.formaPagamento.includes(':obs=')) {
                      notaInterna = venda.formaPagamento.split(':obs=')[1];
                    }
                    
                    const limpaNota = notaInterna.replace(';pago=true', '').replace('pago=true', '');
                    const isQuitada = venda.formaPagamento.includes('pago=true');
                    const nomeCliente = clienteNomeMap.get(Number(venda.idCliente)) || 'Consumidor Final (Fixos)';

                    return (
                      <tr key={venda.id} className={`transition-colors ${isQuitada ? 'bg-green-50/40 opacity-70' : 'hover:bg-purple-50/20'}`}>
                        <td className="p-3 text-sm text-zinc-500">{new Date(venda.data).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3 text-sm font-black text-zinc-800">{String(nomeCliente)}</td>
                        <td className={`p-3 text-sm font-medium ${isQuitada ? 'text-zinc-500 line-through' : 'text-purple-700 bg-purple-50/40'}`}>{limpaNota}</td>
                        <td className={`p-3 text-sm font-black ${isQuitada ? 'text-zinc-400 line-through' : 'text-purple-600'}`}>{formataMoeda(venda.total)}</td>
                        <td className="p-3 text-center">
                          {isQuitada ? (
                            <span className="bg-green-100 text-green-700 border border-green-300 px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider">✅ Quitado</span>
                          ) : (
                            <div className="flex justify-center items-center gap-2">
                              <button onClick={() => handleQuitarConta(venda.id, String(nomeCliente))} className="bg-green-600 text-white text-xs font-black px-3 py-1.5 rounded hover:bg-green-700 transition-colors uppercase shadow-sm">💰 Quitar</button>
                              <button onClick={() => handleAlterarNota(venda.id, limpaNota)} className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded hover:bg-purple-200 transition-colors uppercase">📝 Notas</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {abaAtiva === 'dre' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300 space-y-6">
          <div>
            <h2 className="text-xl font-black text-blue-700">🧮 Demonstrativo de Resultados do Exercício (DRE)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50">
              <h3 className="font-black text-sm uppercase text-zinc-700 border-b pb-2 tracking-wide mb-4">📅 Performance deste Mês</h3>
              <div className="space-y-3 font-semibold text-sm">
                <div className="flex justify-between text-zinc-600"><span>(+) Receita Bruta de Vendas (Loja + Direta)</span><span className="font-black text-zinc-800">{formataMoeda(totalVendidoMes)}</span></div>
                <div className="flex justify-between text-orange-600 border-b pb-2"><span>(-) Custo da Mercadoria Vendida (CMV)</span><span className="font-black">({formataMoeda(custoMercadoriaMes)})</span></div>
                <div className="flex justify-between text-zinc-800 font-black text-base bg-white p-2 rounded shadow-sm"><span>(=) LUCRO BRUTO INTEGRADO</span><span className="text-blue-700">{formataMoeda(totalVendidoMes - custoMercadoriaMes)}</span></div>
                <div className="flex justify-between text-red-600 border-b pb-2 pt-2"><span>(-) Despesas Estruturais & Operacionais</span><span className="font-black">({formataMoeda(despesasOperacionaisMes)})</span></div>
                <div className="flex justify-between text-white font-black text-lg bg-zinc-800 p-3 rounded-lg shadow-md">
                  <span>(=) LUCRO LÍQUIDO REAL</span>
                  <span className={(totalVendidoMes - custoMercadoriaMes - despesasOperacionaisMes) >= 0 ? "text-green-400" : "text-red-400"}>
                    {formataMoeda(totalVendidoMes - custoMercadoriaMes - despesasOperacionaisMes)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50">
              <h3 className="font-black text-sm uppercase text-zinc-700 border-b pb-2 tracking-wide mb-4">🌍 Performance Histórica Total</h3>
              <div className="space-y-3 font-semibold text-sm">
                <div className="flex justify-between text-zinc-600"><span>(+) Receita Bruta Acumulada</span><span className="font-black text-zinc-800">{formataMoeda(totalVendidoSempre)}</span></div>
                <div className="flex justify-between text-orange-600 border-b pb-2"><span>(-) Custo de Aquisição Total (CMV)</span><span className="font-black">({formataMoeda(custoMercadoriaTotal)})</span></div>
                <div className="flex justify-between text-zinc-800 font-black text-base bg-white p-2 rounded shadow-sm"><span>(=) LUCRO BRUTO ACUMULADO</span><span className="text-blue-700">{formataMoeda(totalVendidoSempre - custoMercadoriaTotal)}</span></div>
                <div className="flex justify-between text-red-600 border-b pb-2 pt-2"><span>(-) Despesas Estruturais Acumuladas</span><span className="font-black">({formataMoeda(despesasOperacionaisTotal)})</span></div>
                <div className="flex justify-between text-white font-black text-lg bg-zinc-900 p-3 rounded-lg shadow-md">
                  <span>(=) RESULTADO LÍQUIDO HISTÓRICO</span>
                  <span className={(totalVendidoSempre - custoMercadoriaTotal - despesasOperacionaisTotal) >= 0 ? "text-green-400" : "text-red-400"}>
                    {formataMoeda(totalVendidoSempre - custoMercadoriaTotal - despesasOperacionaisTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'giro' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300">
          <div className="mb-4">
            <h2 className="text-xl font-black text-orange-600">📦 Inteligência de Giro de Estoque e Compras</h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left">
              <thead className="bg-orange-50 border-b border-orange-200">
                <tr>
                  <th className="p-3 text-xs font-bold text-orange-900">Produto</th>
                  <th className="p-3 text-xs font-bold text-orange-900 text-center">Saídas Recentes</th>
                  <th className="p-3 text-xs font-bold text-orange-900 text-center">Físico Atual</th>
                  <th className="p-3 text-xs font-bold text-orange-900 text-center">Status de Giro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-semibold text-sm">
                {listaProdutos.map((p: any) => {
                  const qtdSaidas = vendasPorProduto[p.id] || 0;
                  const estoqueAtual = Number(p.estoque || 0);
                  let statusGiro = "🟢 Seguro / Confortável";
                  let corGiro = "bg-green-100 text-green-800 border-green-300";
                  if (estoqueAtual === 0) {
                    statusGiro = "🔴 REPOR URGENTE";
                    corGiro = "bg-red-100 text-red-800 border-red-300 animate-pulse";
                  } else if (estoqueAtual <= 5 && qtdSaidas > 8) {
                    statusGiro = "🔥 ALTO GIRO / CRÍTICO";
                    corGiro = "bg-orange-100 text-orange-800 border-orange-300";
                  }
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/50">
                      <td className="p-3 text-zinc-900 font-black">{String(p.nome)}</td>
                      <td className="p-3 text-center text-zinc-800">{qtdSaidas} un.</td>
                      <td className={`p-3 text-center font-black ${estoqueAtual <= 3 ? 'text-red-600' : 'text-zinc-700'}`}>{estoqueAtual} un.</td>
                      <td className="p-3 text-center"><span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase ${corGiro}`}>{statusGiro}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {abaAtiva === 'etiquetas' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300">
          <div className="mb-4">
            <h2 className="text-xl font-black text-emerald-700">🏷️ Gerador Digital de Etiquetas para Balcão</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {listaProdutos.map((p: any) => (
              <div key={p.id} className="p-4 border border-zinc-200 rounded-xl hover:border-emerald-500 transition-all bg-zinc-50 flex items-center justify-between gap-4">
                <div className="truncate">
                  <p className="font-black text-sm text-zinc-800 truncate" title={p.nome}>{String(p.nome)}</p>
                  <p className="text-xs font-black text-emerald-600 mt-1">{formataMoeda(p.precoVenda)}</p>
                </div>
                <button onClick={() => dispararImpressaoEtiqueta(p)} className="bg-emerald-600 text-white text-xs font-black px-4 py-2.5 rounded-lg shadow-sm">🖨️ Imprimir</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== 🚀 NOVA ABA: PASSO 5: METAS E COMISSÕES ==================== */}
      {abaAtiva === 'comissoes' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-amber-600">🎖️ Programa de Metas e Comissões</h2>
              <p className="text-zinc-500 text-sm mt-0.5">Acompanhe a performance da equipa e o bónus financeiro gerado pelas vendas deste mês.</p>
            </div>
            <div className="flex gap-3">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Meta Global (R$)</label>
                <input type="number" value={metaLoja} onChange={(e) => setMetaLoja(Number(e.target.value) || 1)} className="p-2 border border-zinc-300 rounded-lg text-sm font-black text-zinc-800 outline-none focus:border-amber-500 w-32" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Taxa Com. (%)</label>
                <input type="number" value={taxaComissao} onChange={(e) => setTaxaComissao(Number(e.target.value) || 0)} className="p-2 border border-zinc-300 rounded-lg text-sm font-black text-zinc-800 outline-none focus:border-amber-500 w-24" />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-zinc-600">Progresso da Meta Mensal</span>
              <span className="font-black text-amber-600 text-lg">{progressoMeta.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-4 overflow-hidden shadow-inner">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${progressoMeta}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-zinc-400 mt-1 font-bold">
              <span>{formataMoeda(totalVendidoMes)} Realizado</span>
              <span>{formataMoeda(metaLoja)} Alvo</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(vendasPorVendedor).map(([idVendedor, totalVendido]: [string, any]) => {
              const valorVendido = Number(totalVendido);
              const valorComissao = valorVendido * (taxaComissao / 100);
              
              return (
                <div key={idVendedor} className="border border-amber-200 bg-amber-50/30 rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-200 text-amber-800 text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase">
                    ID Ref: {idVendedor}
                  </div>
                  <h3 className="font-black text-zinc-800 text-lg mb-4 mt-2">
                    {idVendedor === 'Loja Principal' ? 'Sede / Balcão Fixo' : `Vendedor Parceiro #${idVendedor}`}
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-bold">Vendas Fechadas:</span>
                      <span className="font-black text-zinc-800">{formataMoeda(valorVendido)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-amber-200/50 pt-2">
                      <span className="text-amber-700 font-black uppercase">Prémio a Pagar:</span>
                      <span className="font-black text-amber-600 text-xl">{formataMoeda(valorComissao)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {Object.keys(vendasPorVendedor).length === 0 && (
              <div className="col-span-full p-8 text-center border-2 border-dashed border-zinc-200 rounded-xl">
                <span className="text-3xl">💤</span>
                <p className="text-zinc-400 font-bold mt-2">Nenhuma venda registada este mês para calcular comissões.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}