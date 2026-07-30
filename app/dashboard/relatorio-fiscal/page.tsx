// app/dashboard/relatorio-fiscal/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getDadosDashboard } from '../dashboardActions';
import Link from 'next/link';

export default function RelatorioFiscalPage() {
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const res = await getDadosDashboard();
    setDados(res);
    setCarregando(false);
  }

  const formataMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (carregando) {
    return <div className="p-8 text-center text-[#6A283A] font-bold animate-pulse">Carregando dados fiscais...</div>;
  }

  // Filtragem de dados
  const listaVendas = dados?.listaVendas || [];
  const vendasValidas = listaVendas.filter((v: any) => v.status !== 'cancelada');
  const vendasMes = vendasValidas.filter((v: any) => v.data && v.data.startsWith(mesSelecionado));

  let mesPix = 0;
  let mesCredito = 0;
  let mesDebito = 0;

  const vendasParaContador = vendasMes.map((v: any) => {
    const formaStr = String(v.formaPagamento).toLowerCase();
    let valorCNPJ = 0;
    let descricoesForma: string[] = [];

    if (formaStr === 'pix') { 
      valorCNPJ = v.total; 
      mesPix += v.total;
      descricoesForma.push('PIX'); 
    }
    else if (formaStr === 'credito') { 
      valorCNPJ = v.total; 
      mesCredito += v.total;
      descricoesForma.push('Cartão de Crédito'); 
    }
    else if (formaStr === 'debito') { 
      valorCNPJ = v.total; 
      mesDebito += v.total;
      descricoesForma.push('Cartão de Débito'); 
    }
    else if (formaStr.startsWith('multiplo:')) {
      const partes = formaStr.replace('multiplo:', '').split(';');
      for (const parte of partes) {
        const [tipo, valor] = parte.split('=');
        const valNum = Number(valor) || 0;
        if (valNum > 0) {
          if (tipo === 'pix') { valorCNPJ += valNum; mesPix += valNum; descricoesForma.push(`PIX (${formataMoeda(valNum)})`); }
          if (tipo === 'credito') { valorCNPJ += valNum; mesCredito += valNum; descricoesForma.push(`Crédito (${formataMoeda(valNum)})`); }
          if (tipo === 'debito') { valorCNPJ += valNum; mesDebito += valNum; descricoesForma.push(`Débito (${formataMoeda(valNum)})`); }
        }
      }
    }

    return {
      ...v,
      valorCNPJ,
      textoFormasCNPJ: descricoesForma.join(' + ')
    };
  }).filter((v: any) => v.valorCNPJ > 0);

  const totalFiscalCalculado = mesPix + mesCredito + mesDebito;

  const exportarRelatorioContadorPDF = () => {
    if (vendasParaContador.length === 0) {
      return alert('Não há vendas registradas via PIX ou Cartão (CNPJ) para o mês selecionado.');
    }

    const popup = window.open('', '_blank', 'width=1000,height=1000');
    if (!popup) return alert('Por favor, autorize pop-ups no seu navegador para emitir o PDF!');

    const dataEmissao = new Date().toLocaleString('pt-BR');
    const mesNome = mesSelecionado.split('-').reverse().join('/');

    const linhasTabela = vendasParaContador.map((v: any) => `
      <tr>
        <td>${new Date(v.data).toLocaleString('pt-BR')}</td>
        <td><strong>#${v.id}</strong></td>
        <td>${v.textoFormasCNPJ}</td>
        <td class="right bold">${formataMoeda(v.valorCNPJ)}</td>
      </tr>
    `).join('');

    popup.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Fiscal - ${mesNome}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 10pt; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 30px; }
            h1 { color: #0f172a; margin: 0 0 5px 0; font-size: 18pt; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
            p { margin: 0; color: #475569; font-size: 10pt; }
            .resumo { display: flex; gap: 15px; margin-bottom: 30px; }
            .card { flex: 1; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; }
            .card-title { font-size: 8pt; text-transform: uppercase; font-weight: 700; color: #475569; margin-bottom: 8px; }
            .card-value { font-size: 18pt; font-weight: 900; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 9pt; }
            th { background: #f1f5f9; color: #0f172a; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 8pt; text-align: left; border-bottom: 2px solid #cbd5e1; }
            td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            .right { text-align: right; } .bold { font-weight: bold; } 
            .total-row td { border-top: 2px solid #0f172a; color: #0f172a; padding: 15px 12px; font-size: 11pt; background: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="float: right; text-align: right;">
              <p>Competência: <strong>${mesNome}</strong></p>
              <p>Emitido: <strong>${dataEmissao}</strong></p>
            </div>
            <h1>RELATÓRIO FISCAL - CNPJ</h1>
            <p>O MUNDO DOS PERFUMES</p>
          </div>
          
          <div class="resumo">
            <div class="card">
              <div class="card-title">Total via PIX</div>
              <div class="card-value">${formataMoeda(mesPix)}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Cartão (Débito)</div>
              <div class="card-value">${formataMoeda(mesDebito)}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Cartão (Crédito)</div>
              <div class="card-value">${formataMoeda(mesCredito)}</div>
            </div>
          </div>

          <div style="background: #0f172a; color: #fff; padding: 15px; border-radius: 6px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 9pt; text-transform: uppercase; font-weight: 700;">Base de Cálculo (Total CNPJ)</div>
            <div style="font-size: 18pt; font-weight: 900;">${formataMoeda(totalFiscalCalculado)}</div>
          </div>

          <h3 style="color: #0f172a; font-size: 11pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px;">Detalhamento das Operações (PIX / Cartões)</h3>
          <table>
            <thead><tr><th style="width: 20%;">Data/Hora</th><th style="width: 15%;">Nº Cupom</th><th style="width: 45%;">Origem Fiscal (Forma)</th><th style="width: 20%;" class="right">Valor R$</th></tr></thead>
            <tbody>
              ${linhasTabela}
              <tr class="total-row bold"><td colspan="3" class="right">TOTAL TRIBUTÁVEL:</td><td class="right">${formataMoeda(totalFiscalCalculado)}</td></tr>
            </tbody>
          </table>
          <div style="text-align: center; margin-top: 40px; font-size: 8pt; color: #94a3b8;">Documento de uso gerencial e contábil. Dinheiro físico e valores pendentes foram excluídos.</div>
          <script>window.onload = function() { setTimeout(() => { window.print(); }, 300); }</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h2 className="text-2xl font-black text-zinc-800 flex items-center gap-2">📄 Relatório do Contador (CNPJ)</h2>
          <p className="text-zinc-500 text-sm font-medium mt-1">Isolamento inteligente de receitas via PIX e Cartões para apuração de impostos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-[#E0DDDD] shadow-sm w-full sm:w-auto">
            <span className="text-lg">📅</span>
            <input 
              type="month" 
              value={mesSelecionado} 
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-transparent text-sm font-black text-zinc-700 outline-none cursor-pointer w-full"
            />
          </div>
          <button 
            onClick={exportarRelatorioContadorPDF} 
            className="w-full sm:w-auto bg-[#6A283A] hover:bg-[#521e2d] text-white font-black px-6 py-3 rounded-xl transition-all shadow-md uppercase tracking-wider text-sm flex items-center justify-center gap-2"
          >
            🖨️ Imprimir PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-teal-500">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total em PIX</h3>
          <p className="text-2xl font-black text-teal-700 mt-2">{formataMoeda(mesPix)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E0DDDD] border-l-4 border-l-blue-500">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Cartão (Débito/Crédito)</h3>
          <p className="text-2xl font-black text-blue-700 mt-2">{formataMoeda(mesCredito + mesDebito)}</p>
        </div>
        <div className="bg-zinc-800 p-5 rounded-xl border border-zinc-900 shadow-lg text-white">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Base de Cálculo (CNPJ)</h3>
          <p className="text-3xl font-black text-white mt-2">{formataMoeda(totalFiscalCalculado)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
        <h2 className="text-lg font-bold text-zinc-800 mb-4">Pré-visualização de Movimentações ({mesSelecionado.split('-').reverse().join('/')})</h2>
        <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]/60">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-[#E0DDDD]">
              <tr>
                <th className="p-3 text-xs font-bold text-zinc-600">Data</th>
                <th className="p-3 text-xs font-bold text-zinc-600">Cupom</th>
                <th className="p-3 text-xs font-bold text-zinc-600">Modalidade</th>
                <th className="p-3 text-xs font-bold text-zinc-600 text-right">Valor Registrado</th>
              </tr>
            </thead>
            <tbody>
              {vendasParaContador.map((v: any) => (
                <tr key={v.id} className="border-b border-[#E0DDDD]/50 hover:bg-zinc-50">
                  <td className="p-3 text-sm text-zinc-600">{new Date(v.data).toLocaleString('pt-BR')}</td>
                  <td className="p-3 text-sm font-bold text-zinc-800">#{v.id}</td>
                  <td className="p-3 text-xs font-bold text-zinc-500 uppercase">{v.textoFormasCNPJ}</td>
                  <td className="p-3 text-sm font-black text-zinc-800 text-right">{formataMoeda(v.valorCNPJ)}</td>
                </tr>
              ))}
              {vendasParaContador.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-400 font-medium">
                    Nenhuma movimentação bancária/fiscal encontrada neste mês.
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