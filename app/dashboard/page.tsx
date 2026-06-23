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

  // 🚀 Controle unificado de todas as abas estratégicas
  const [abaAtiva, setAbaAtiva] = useState('geral');

  // Estados para as Comissões
  const [metaLoja, setMetaLoja] = useState<number>(50000); 
  const [taxaComissao, setTaxaComissao] = useState<number>(5);

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

  const handleEnviarCobrancaWhatsApp = (venda: any, nomeCliente: string, notaInterna: string) => {
    let telefone = '';
    if (venda.idCliente && dados?.listaClientes) {
      const cObj = dados.listaClientes.find((c: any) => Number(c.id) === Number(venda.idCliente));
      if (cObj && cObj.telefone) {
        telefone = cObj.telefone.replace(/\D/g, ''); 
      }
    }
    if (telefone && !telefone.startsWith('55') && telefone.length >= 10) {
      telefone = '55' + telefone;
    }
    const textoCobranca = `*O MUNDO DOS PERFUMES* 🛍️\n\nOlá, *${nomeCliente}*! Tudo bem?\n\nPassando para lembrar do seu pagamento pendente no valor de *${formataMoeda(venda.total)}*.\n\n*Anotação do combinado:* _${notaInterna}_\n\nSe precisar da nossa chave PIX ou tiver qualquer dúvida sobre as parcelas, basta responder por aqui. Muito obrigado! ✨`;
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(textoCobranca)}`, '_blank');
  };

  // 🚀 NOVO: DISPARO DE PÓS-VENDA E FIDELIZAÇÃO NO CRM
  const handleEnviarPosVendaCRM = (telefoneBase: string, nomeCliente: string, diasUltimaCompra: number) => {
    let telefone = telefoneBase.replace(/\D/g, ''); 
    if (telefone && !telefone.startsWith('55') && telefone.length >= 10) {
      telefone = '55' + telefone;
    }
    
    let texto = `*O MUNDO DOS PERFUMES* 🛍️\n\nOlá, *${nomeCliente}*, tudo bem?\n\n`;
    if (diasUltimaCompra > 60) {
      texto += `Faz um tempinho que você não nos visita! Chegaram várias novidades e fragrâncias incríveis na loja. Quer conferir o nosso catálogo novo com um desconto especial? ✨`;
    } else {
      texto += `Passando para agradecer a preferência e saber se você está gostando do(s) produto(s) que adquiriu recentemente conosco! Qualquer dúvida, estamos à disposição. 💖`;
    }

    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`, '_blank');
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
    csvCompleto += "O MUNDO DOS PERFUMES\nRELATÓRIO GERENCIAL DE VENDAS\n";
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
      return `<tr class="${v.status === 'cancelada' ? 'linha-cancelada' : ''}"><td><strong>#${v.id}</strong></td><td>${new Date(v.data).toLocaleString('pt-BR')}</td><td>${formatarPagamentoTabela(v.formaPagamento)}</td><td><span class="status-badge ${statusClasse}">${statusTexto}</span></td><td class="right bold ${valorClasse}">${formataMoeda(v.total)}</td></tr>`;
    }).join('');

    popup.document.write(`
      <html>
        <head>
          <title>Relatório de Vendas</title>
          <style>
            @page { size: A4; margin: 15mm 12mm; } body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2d3748; margin: 0; padding: 0; font-size: 10.5pt; }
            .header { border-bottom: 3px solid #6A283A; padding-bottom: 12px; margin-bottom: 25px; display: table; width: 100%; } .header-left { display: table-cell; vertical-align: bottom; } .header-right { display: table-cell; text-align: right; vertical-align: bottom; font-size: 9pt; color: #718096; } .header-left h1 { color: #6A283A; margin: 0; font-size: 24pt; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9.5pt; } th { background: #6A283A; color: #ffffff; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 8pt; text-align: left; } td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            .status-badge { padding: 3px 8px; font-size: 7.5pt; font-weight: 800; border-radius: 4px; } .status-concluida { background-color: #c6f6d5; color: #22543d; } .status-cancelada { background-color: #fed7d7; color: #742a2a; } .right { text-align: right; } .bold { font-weight: bold; } .total-row td { border-top: 2px solid #6A283A; color: #6A283A; padding: 14px 12px; }
          </style>
        </head>
        <body>
          <div class="header"><div class="header-left"><h1>O MUNDO DOS PERFUMES</h1></div><div class="header-right"><p>Data: <strong>${dataEmissao}</strong></p></div></div>
          <table><thead><tr><th style="width: 12%;">Cupom</th><th style="width: 25%;">Data e Hora</th><th style="width: 33%;">Forma de Pagamento</th><th style="width: 15%;">Status</th><th style="width: 15%;" class="right">Valor Líquido</th></tr></thead><tbody>${linhasTabela}<tr class="total-row bold"><td colspan="3"></td><td>TOTAL LÍQUIDO:</td><td class="right">${formataMoeda(totalRelatorio)}</td></tr></tbody></table>
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
          <div class="box"><div class="brand">${produto.marca || 'O MUNDO DOS PERFUMES'}</div><div class="title">${produto.nome}</div><div class="price">${formataMoeda(produto.precoVenda)}</div><div class="bar">|||||||||||||||||||||||||||||||</div><div style="font-size: 8pt; font-weight: bold;">${produto.codigoBarras || 'SEM CÓDIGO'}</div></div>
          <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 600); }</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold animate-pulse">Carregando Painel Geral...</div>;

  if (!isAdmin) {
    return (
      <div className="bg-gradient-to-br from-[#6A283A] to-[#521e2d] text-white p-6 md:p-10 rounded-2xl border border-[#521e2d] shadow-2xl flex flex-col items-center justify-center text-center gap-6 mt-10 max-w-2xl mx-auto">
        <div className="text-6xl mb-2">🛍️</div>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-[#EED9D4]">Olá, {usuarioNome}!</h2>
        <Link href="/dashboard/caixa" className="w-full md:w-auto bg-[#EED9D4] text-[#6A283A] font-black py-4 px-10 rounded-xl hover:bg-white transition-all uppercase tracking-wider shadow-lg mt-4">🛒 Abrir o Caixa (PDV)</Link>
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
  const custoProdutoMap = new Map<number, number>(listaProdutos.map((p: any) => [Number(p.id), Number(p.precoCusto || 0)]));

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
      if (idsVendasMes.has(item.idVenda)) custoMercadoriaMes += (custoUnitario * itemQtd);
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

  const clientNameMapSecure = new Map<number, string>(listaClientes.map((c: any) => [Number(c.id), String(c.nome || 'Consumidor Fixo')]));

  // 🚀 LÓGICA DO CRM: Histórico de Compras (LTV)
  const crmClientes = listaClientes.map((cliente: any) => {
    const comprasDoCliente = vendasValidas.filter((v: any) => Number(v.idCliente) === Number(cliente.id));
    const totalGasto = comprasDoCliente.reduce((acc: number, v: any) => acc + Number(v.total || 0), 0);
    // Como a lista de vendas está descrescente (recente primeiro), a venda[0] é a última
    const dataUltimaCompra = comprasDoCliente.length > 0 ? comprasDoCliente[0].data : null;
    
    let diasSemComprar = 0;
    if (dataUltimaCompra) {
      const msDiff = new Date().getTime() - new Date(dataUltimaCompra).getTime();
      diasSemComprar = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    }

    return { ...cliente, totalGasto, qtdCompras: comprasDoCliente.length, dataUltimaCompra, diasSemComprar };
  }).sort((a: any, b: any) => b.totalGasto - a.totalGasto); // Ranking de quem gasta mais

  // 🚀 LÓGICA COMISSÕES
  const vendasPorVendedor = vendasMes.reduce((acc: any, v: any) => {
    const id = v.idVendedor ? String(v.idVendedor) : 'Loja Principal';
    acc[id] = (acc[id] || 0) + Number(v.total || 0);
    return acc;
  }, {});
  const progressoMeta = Math.min((totalVendidoMes / metaLoja) * 100, 100);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      <div className="bg-gradient-to-r from-[#EED9D4]/40 to-white p-5 rounded-2xl border border-[#6A283A]/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#6A283A] p-3 rounded-full shadow-lg border-2 border-white text-white">🛡️</div>
          <div>
            <h3 className="font-black text-[#6A283A] text-lg uppercase tracking-wide">Módulo de Governança Absoluta</h3>
            <p className="text-zinc-600 text-sm mt-0.5 font-medium">Controle de carteira (CRM), P&L, comissões, fluxo de mercadoria e rotulagem em um só lugar.</p>
          </div>
        </div>
      </div>

      {/* 🚀 NOVO MENU COMPLETO DE ABAS */}
      <div className="flex overflow-x-auto gap-2 border-b border-zinc-200 pb-px scrollbar-none">
        <button onClick={() => setAbaAtiva('geral')} className={`px-4 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'geral' ? 'border-[#6A283A] text-[#6A283A]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>📊 Resumo</button>
        <button onClick={() => setAbaAtiva('receber')} className={`px-4 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'receber' ? 'border-purple-600 text-purple-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>📝 A Receber</button>
        <button onClick={() => setAbaAtiva('crm')} className={`px-4 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'crm' ? 'border-pink-600 text-pink-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>🛍️ CRM (Clientes)</button>
        <button onClick={() => setAbaAtiva('dre')} className={`px-4 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'dre' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>🧮 DRE Gerencial</button>
        <button onClick={() => setAbaAtiva('giro')} className={`px-4 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'giro' ? 'border-orange-500 text-orange-500' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>📦 Giro / Compras</button>
        <button onClick={() => setAbaAtiva('comissoes')} className={`px-4 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'comissoes' ? 'border-amber-500 text-amber-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>🎖️ Comissões</button>
        <button onClick={() => setAbaAtiva('etiquetas')} className={`px-4 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${abaAtiva === 'etiquetas' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>🏷️ Etiquetas</button>
      </div>

      {/* ==================== ABA GERAL ==================== */}
      {abaAtiva === 'geral' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-[#6A283A] flex flex-col justify-between">
              <div><h3 className="text-xs font-bold text-zinc-500 uppercase">Vendas de Hoje</h3><p className="text-2xl font-black text-[#6A283A] mt-2">{formataMoeda(totalVendidoHoje)}</p></div>
              <div className="mt-4 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-500 text-center">
                <div className="bg-zinc-50 p-1.5 rounded">💵 {formataMoeda(hojeDinheiro)}</div>
                <div className="bg-zinc-50 p-1.5 rounded">💠 {formataMoeda(hojePix)}</div>
                <div className="bg-blue-50 text-blue-700 p-1.5 rounded">💳 CR: {formataMoeda(hojeCredito)}</div>
                <div className="bg-teal-50 text-teal-700 p-1.5 rounded">💳 DB: {formataMoeda(hojeDebito)}</div>
                <div className="bg-purple-50 text-purple-700 p-1.5 rounded col-span-2">📝 DIRETA: {formataMoeda(hojeVendaDireta)}</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-[#A56877] flex flex-col justify-between">
              <div><h3 className="text-xs font-bold text-zinc-500 uppercase">Faturamento Mês</h3><p className="text-2xl font-black text-[#A56877] mt-2">{formataMoeda(totalVendidoMes)}</p></div>
              <div className="mt-4 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-500 text-center">
                <div className="bg-zinc-50 p-1.5 rounded">💵 {formataMoeda(mesDinheiro)}</div>
                <div className="bg-zinc-50 p-1.5 rounded">💠 {formataMoeda(mesPix)}</div>
                <div className="bg-blue-50 text-blue-700 p-1.5 rounded">💳 CR: {formataMoeda(mesCredito)}</div>
                <div className="bg-teal-50 text-teal-700 p-1.5 rounded">💳 DB: {formataMoeda(mesDebito)}</div>
                <div className="bg-purple-50 text-purple-700 p-1.5 rounded col-span-2">📝 DIRETA: {formataMoeda(mesVendaDireta)}</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-purple-600 flex flex-col justify-between">
              <div><h3 className="text-xs font-bold text-zinc-500 uppercase">Total Venda Direta</h3><p className="text-2xl font-black text-purple-600 mt-2">{formataMoeda(totalVendaDiretaSempre)}</p></div>
              <div className="mt-4 pt-2 border-t border-zinc-100 text-xs text-zinc-500 font-bold flex justify-between"><span>Balcão:</span><span className="text-zinc-800">{formataMoeda(totalVendidoSempre - totalVendaDiretaSempre)}</span></div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-orange-500 flex flex-col justify-between">
              <div><h3 className="text-xs font-bold text-zinc-500 uppercase">Custos (CMV) Mês</h3><p className="text-2xl font-black text-orange-600 mt-2">{formataMoeda(custoMercadoriaMes)}</p></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-[#6A283A]">Histórico de Vendas</h2>
              <div className="flex items-center gap-2">
                <button onClick={exportarParaExcel} className="bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm">📥 Excel</button>
                <button onClick={exportarParaPDF} className="bg-[#6A283A] text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm">📄 PDF</button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60 flex-1 max-h-[400px]">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-zinc-50 sticky top-0 border-b border-[#E0DDDD] z-10">
                  <tr><th className="p-3 text-xs font-bold text-zinc-600">Data</th><th className="p-3 text-xs font-bold text-zinc-600">Valor</th><th className="p-3 text-xs font-bold text-zinc-600">Pagamento</th><th className="p-3 text-xs font-bold text-zinc-600">Status</th></tr>
                </thead>
                <tbody>
                  {listaVendas.map((venda: any) => (
                    <tr key={venda.id} className={`border-b border-[#E0DDDD]/50 ${venda.status === 'cancelada' ? 'bg-red-50/50' : ''}`}>
                      <td className="p-3 text-sm text-zinc-600">{new Date(venda.data).toLocaleString('pt-BR')}</td>
                      <td className={`p-3 text-sm font-black ${venda.status === 'cancelada' ? 'text-zinc-400 line-through' : 'text-green-600'}`}>{formataMoeda(venda.total)}</td>
                      <td className="p-3 text-xs font-bold text-zinc-500 uppercase">{formatarPagamentoTabela(venda.formaPagamento)}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${venda.status === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{venda.status === 'cancelada' ? 'Cancelada' : 'Concluída'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ABA CONTAS A RECEBER ==================== */}
      {abaAtiva === 'receber' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300">
          <div className="mb-4">
            <h2 className="text-xl font-black text-purple-700">📑 Monitoramento Dinâmico de Contas a Receber</h2>
            <p className="text-zinc-500 text-sm mt-0.5">Gerencie parcelamentos ativos e envie cobranças rápidas por WhatsApp com um clique.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-purple-50 border-b border-purple-200">
                <tr><th className="p-3 text-xs font-bold text-purple-900">Data</th><th className="p-3 text-xs font-bold text-purple-900">Cliente</th><th className="p-3 text-xs font-bold text-purple-900">Nota de Conferência</th><th className="p-3 text-xs font-bold text-purple-900">Devedor</th><th className="p-3 text-xs font-bold text-purple-900 text-center">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-semibold text-sm">
                {listaVendas.filter((v: any) => v.status !== 'cancelada' && (obterPagamento(v).startsWith('venda_direta') || obterPagamento(v).includes('obs='))).map((venda: any) => {
                  let nota = 'Nota Geral de Balcão';
                  if (venda.formaPagamento.includes('obs=')) nota = venda.formaPagamento.match(/obs=([^;]+)/)?.[1] || nota;
                  else if (venda.formaPagamento.includes(':obs=')) nota = venda.formaPagamento.split(':obs=')[1];
                  const limpa = nota.replace(';pago=true', '').replace('pago=true', '');
                  const quitada = venda.formaPagamento.includes('pago=true');
                  const nome = clientNameMapSecure.get(Number(venda.idCliente)) || 'Consumidor Final';
                  return (
                    <tr key={venda.id} className={`${quitada ? 'bg-green-50/40 opacity-70' : 'hover:bg-purple-50/20'}`}>
                      <td className="p-3 text-zinc-500">{new Date(venda.data).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 text-zinc-800 font-black">{nome}</td>
                      <td className={`p-3 font-medium ${quitada ? 'text-zinc-500 line-through' : 'text-purple-700 bg-purple-50/40'}`}>{limpa}</td>
                      <td className={`p-3 font-black ${quitada ? 'text-zinc-400 line-through' : 'text-purple-600'}`}>{formataMoeda(venda.total)}</td>
                      <td className="p-3 text-center">
                        {quitada ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded text-[10px] font-black uppercase">✅ Quitado</span> : (
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleQuitarConta(venda.id, nome)} className="bg-green-600 text-white text-[11px] font-black px-3 py-1.5 rounded uppercase">💰 Quitar</button>
                            <button onClick={() => handleAlterarNota(venda.id, limpa)} className="bg-purple-100 text-purple-700 text-[11px] font-bold px-3 py-1.5 rounded uppercase">📝 Notas</button>
                            <button onClick={() => handleEnviarCobrancaWhatsApp(venda, nome, limpa)} className="bg-[#25D366] text-white text-[11px] font-black px-3 py-1.5 rounded uppercase flex items-center gap-1">📱 Cobrar</button>
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

      {/* ==================== 🚀 NOVA ABA: CRM DE CLIENTES (FIDELIZAÇÃO) ==================== */}
      {abaAtiva === 'crm' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300">
          <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
            <div>
              <h2 className="text-xl font-black text-pink-600">🛍️ Histórico de Consumo (CRM)</h2>
              <p className="text-zinc-500 text-sm mt-0.5">Ranking de clientes que mais compram na loja (LTV) e dias sem comprar para Pós-Venda.</p>
            </div>
            <div className="bg-pink-50 border border-pink-200 text-pink-700 px-4 py-2 rounded-lg text-sm font-bold">
              Base Total: {listaClientes.length} Clientes Cadastrados
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-pink-50 border-b border-pink-200">
                <tr>
                  <th className="p-3 text-xs font-bold text-pink-900">🏆 Ranking Cliente</th>
                  <th className="p-3 text-xs font-bold text-pink-900 text-center">Nº de Compras</th>
                  <th className="p-3 text-xs font-bold text-pink-900">Total Gasto na Loja</th>
                  <th className="p-3 text-xs font-bold text-pink-900">Última Visita</th>
                  <th className="p-3 text-xs font-bold text-pink-900 text-center">Relacionamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-semibold text-sm">
                {crmClientes.map((cliente: any, index: number) => (
                  <tr key={cliente.id} className="hover:bg-pink-50/20 transition-colors">
                    <td className="p-3 flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${index < 3 ? 'bg-amber-400 text-amber-900 shadow-sm' : 'bg-zinc-100 text-zinc-500'}`}>
                        {index + 1}º
                      </span>
                      <div>
                        <p className="text-zinc-900 font-black">{cliente.nome}</p>
                        <p className="text-[10px] font-bold text-zinc-400">{cliente.telefone || 'Sem WhatsApp'}</p>
                      </div>
                    </td>
                    <td className="p-3 text-center text-zinc-600">{cliente.qtdCompras}x</td>
                    <td className="p-3 font-black text-pink-600">{formataMoeda(cliente.totalGasto)}</td>
                    <td className="p-3">
                      {cliente.dataUltimaCompra ? (
                        <div>
                          <p className="text-zinc-800">{new Date(cliente.dataUltimaCompra).toLocaleDateString('pt-BR')}</p>
                          <p className={`text-[10px] font-bold ${cliente.diasSemComprar > 60 ? 'text-red-500' : 'text-green-500'}`}>
                            {cliente.diasSemComprar === 0 ? 'Comprou Hoje' : `Há ${cliente.diasSemComprar} dias`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-xs">Nunca comprou</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        disabled={!cliente.telefone}
                        onClick={() => handleEnviarPosVendaCRM(cliente.telefone, cliente.nome, cliente.diasSemComprar)} 
                        className={`text-[11px] font-black px-4 py-2 rounded-lg uppercase transition-all shadow-sm ${cliente.telefone ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}
                      >
                        {cliente.telefone ? '💬 Falar no Whats' : 'Sem Contato'}
                      </button>
                    </td>
                  </tr>
                ))}
                {crmClientes.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-400">Nenhum cliente cadastrado com compras ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== ABA DRE GERENCIAL ==================== */}
      {abaAtiva === 'dre' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300 space-y-6">
          <div><h2 className="text-xl font-black text-blue-700">🧮 Demonstrativo de Resultados (DRE)</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50">
              <h3 className="font-black text-sm uppercase text-zinc-700 border-b pb-2 mb-4">📅 Mês Atual</h3>
              <div className="space-y-3 font-semibold text-sm">
                <div className="flex justify-between text-zinc-600"><span>(+) Receita Bruta</span><span className="font-black text-zinc-800">{formataMoeda(totalVendidoMes)}</span></div>
                <div className="flex justify-between text-orange-600 border-b pb-2"><span>(-) Custo Mercadoria (CMV)</span><span className="font-black">({formataMoeda(custoMercadoriaMes)})</span></div>
                <div className="flex justify-between text-zinc-800 font-black text-base bg-white p-2 rounded"><span>(=) LUCRO BRUTO</span><span className="text-blue-700">{formataMoeda(totalVendidoMes - custoMercadoriaMes)}</span></div>
                <div className="flex justify-between text-red-600 border-b pb-2 pt-2"><span>(-) Despesas Estruturais</span><span className="font-black">({formataMoeda(despesasOperacionaisMes)})</span></div>
                <div className="flex justify-between text-white font-black text-lg bg-zinc-800 p-3 rounded-lg shadow-md"><span>(=) LUCRO LÍQUIDO</span><span className={(totalVendidoMes - custoMercadoriaMes - despesasOperacionaisMes) >= 0 ? "text-green-400" : "text-red-400"}>{formataMoeda(totalVendidoMes - custoMercadoriaMes - despesasOperacionaisMes)}</span></div>
              </div>
            </div>
            <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50">
              <h3 className="font-black text-sm uppercase text-zinc-700 border-b pb-2 mb-4">🌍 Histórico Total</h3>
              <div className="space-y-3 font-semibold text-sm">
                <div className="flex justify-between text-zinc-600"><span>(+) Receita Acumulada</span><span className="font-black text-zinc-800">{formataMoeda(totalVendidoSempre)}</span></div>
                <div className="flex justify-between text-orange-600 border-b pb-2"><span>(-) Custo Total (CMV)</span><span className="font-black">({formataMoeda(custoMercadoriaTotal)})</span></div>
                <div className="flex justify-between text-zinc-800 font-black text-base bg-white p-2 rounded"><span>(=) LUCRO BRUTO</span><span className="text-blue-700">{formataMoeda(totalVendidoSempre - custoMercadoriaTotal)}</span></div>
                <div className="flex justify-between text-red-600 border-b pb-2 pt-2"><span>(-) Despesas Acumuladas</span><span className="font-black">({formataMoeda(despesasOperacionaisTotal)})</span></div>
                <div className="flex justify-between text-white font-black text-lg bg-zinc-900 p-3 rounded-lg shadow-md"><span>(=) RESULTADO FINAL</span><span className={(totalVendidoSempre - custoMercadoriaTotal - despesasOperacionaisTotal) >= 0 ? "text-green-400" : "text-red-400"}>{formataMoeda(totalVendidoSempre - custoMercadoriaTotal - despesasOperacionaisTotal)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ABA GIRO DE ESTOQUE ==================== */}
      {abaAtiva === 'giro' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300">
          <div className="mb-4"><h2 className="text-xl font-black text-orange-600">📦 Inteligência de Compras e Giro</h2></div>
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left">
              <thead className="bg-orange-50 border-b border-orange-200">
                <tr><th className="p-3 text-xs font-bold text-orange-900">Produto</th><th className="p-3 text-xs font-bold text-orange-900 text-center">Saídas Recentes</th><th className="p-3 text-xs font-bold text-orange-900 text-center">Físico Atual</th><th className="p-3 text-xs font-bold text-orange-900 text-center">Status de Giro</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-semibold text-sm">
                {listaProdutos.map((p: any) => {
                  const qtdSaidas = vendasPorProduto[p.id] || 0;
                  const estoqueAtual = Number(p.estoque || 0);
                  let statusGiro = "🟢 Seguro / Confortável";
                  let corGiro = "bg-green-100 text-green-800 border-green-300";
                  if (estoqueAtual === 0) { statusGiro = "🔴 REPOR URGENTE"; corGiro = "bg-red-100 text-red-800 border-red-300 animate-pulse"; } 
                  else if (estoqueAtual <= 5 && qtdSaidas > 8) { statusGiro = "🔥 ALTO GIRO / CRÍTICO"; corGiro = "bg-orange-100 text-orange-800 border-orange-300"; }
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/50">
                      <td className="p-3 text-zinc-900 font-black">{String(p.nome)}</td><td className="p-3 text-center">{qtdSaidas} un.</td><td className={`p-3 text-center font-black ${estoqueAtual <= 3 ? 'text-red-600' : 'text-zinc-700'}`}>{estoqueAtual} un.</td>
                      <td className="p-3 text-center"><span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase ${corGiro}`}>{statusGiro}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== ABA COMISSÕES ==================== */}
      {abaAtiva === 'comissoes' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
            <div><h2 className="text-xl font-black text-amber-600">🎖️ Metas e Comissões</h2></div>
            <div className="flex gap-3">
              <div><label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Meta Loja (R$)</label><input type="number" value={metaLoja} onChange={(e) => setMetaLoja(Number(e.target.value) || 1)} className="p-2 border border-zinc-300 rounded-lg text-sm font-black w-32 outline-none focus:border-amber-500" /></div>
              <div><label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Comissão (%)</label><input type="number" value={taxaComissao} onChange={(e) => setTaxaComissao(Number(e.target.value) || 0)} className="p-2 border border-zinc-300 rounded-lg text-sm font-black w-24 outline-none focus:border-amber-500" /></div>
            </div>
          </div>
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2"><span className="text-sm font-bold text-zinc-600">Progresso da Meta Mensal</span><span className="font-black text-amber-600 text-lg">{Math.min((totalVendidoMes / metaLoja) * 100, 100).toFixed(1)}%</span></div>
            <div className="w-full bg-zinc-100 rounded-full h-4 overflow-hidden"><div className="bg-gradient-to-r from-amber-400 to-orange-500 h-4 rounded-full" style={{ width: `${Math.min((totalVendidoMes / metaLoja) * 100, 100)}%` }}></div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(vendasMes.reduce((acc: any, v: any) => { const id = v.idVendedor ? String(v.idVendedor) : 'Loja Principal'; acc[id] = (acc[id] || 0) + Number(v.total || 0); return acc; }, {})).map(([idVendedor, total]: [string, any]) => (
              <div key={idVendedor} className="border border-amber-200 bg-amber-50/30 rounded-xl p-5 hover:shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-200 text-amber-800 text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase">ID: {idVendedor}</div>
                <h3 className="font-black text-zinc-800 text-lg mb-4 mt-2">{idVendedor === 'Loja Principal' ? 'Sede / Balcão Fixo' : `Vendedor #${idVendedor}`}</h3>
                <div className="flex justify-between items-center text-sm mb-2"><span className="text-zinc-500 font-bold">Vendido:</span><span className="font-black text-zinc-800">{formataMoeda(Number(total))}</span></div>
                <div className="flex justify-between items-center text-sm border-t border-amber-200 pt-2"><span className="text-amber-700 font-black uppercase">Comissão:</span><span className="font-black text-amber-600 text-xl">{formataMoeda(Number(total) * (taxaComissao / 100))}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== ABA ETIQUETAS ==================== */}
      {abaAtiva === 'etiquetas' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] animate-in fade-in duration-300">
          <div className="mb-4"><h2 className="text-xl font-black text-emerald-700">🏷️ Emissor de Etiquetas de Gôndola</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {listaProdutos.map((p: any) => (
              <div key={p.id} className="p-4 border border-zinc-200 rounded-xl bg-zinc-50 flex items-center justify-between gap-4">
                <div className="truncate"><p className="font-black text-sm text-zinc-800 truncate">{String(p.nome)}</p><p className="text-xs font-black text-emerald-600">{formataMoeda(p.precoVenda)}</p></div>
                <button onClick={() => dispararImpressaoEtiqueta(p)} className="bg-emerald-600 text-white text-xs font-black px-4 py-2.5 rounded-lg shadow-sm">🖨️ Imprimir</button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}