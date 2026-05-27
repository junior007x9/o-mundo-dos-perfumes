'use client';

import { useState, useEffect } from 'react';
import { getCaixaAberto, getProdutosPDV, abrirCaixa, fecharCaixa, finalizarVenda } from './actions';

export default function CaixaPage() {
  const [caixa, setCaixa] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  // Controle do recibo térmico pós-venda
  const [vendaSucesso, setVendaSucesso] = useState<boolean>(false);
  const [dadosUltimaVenda, setDadosUltimaVenda] = useState<any>(null);

  useEffect(() => {
    async function carregarDados() {
      const caixaAtual = await getCaixaAberto();
      const listaProdutos = await getProdutosPDV();
      setCaixa(caixaAtual);
      setProdutos(listaProdutos);
      setCarregando(false);
    }
    carregarDados();
  }, []);

  const adicionarAoCarrinho = (produto: any) => {
    if (produto.estoque <= 0) {
      alert('Produto sem estoque!');
      return;
    }
    const itemExistente = carrinho.find((item) => item.id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(item => item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item));
    } else {
      setCarrinho([...carrinho, { ...produto, quantidade: 1 }]);
    }
  };

  const removerDoCarrinho = (id: number) => {
    setCarrinho(carrinho.filter(item => item.id !== id));
  };

  const totalCompra = carrinho.reduce((acc, item) => acc + (item.precoVenda * item.quantidade), 0);

  const handleFinalizarVenda = async () => {
    if (carrinho.length === 0) return;
    
    // Salva cópia local para a impressora antes de limpar o carrinho
    setDadosUltimaVenda({
      itens: [...carrinho],
      total: totalCompra,
      data: new Date().toISOString()
    });

    await finalizarVenda(caixa.id, carrinho, totalCompra);
    setCarrinho([]);
    setVendaSucesso(true); // Abre a tela de sucesso da impressão

    const novaLista = await getProdutosPDV();
    setProdutos(novaLista);
  };

  // 🚀 IMPRESSÃO TÉRMICA DIRETAMENTE PARA A BOBINA (58mm / 80mm)
  const dispararImpressaoTermica = () => {
    if (!dadosUltimaVenda) return;

    const popup = window.open('', '_blank', 'width=300,height=600');
    if (!popup) {
      alert('Por favor, autorize pop-ups para realizar a impressão do cupom!');
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Cupom de Venda</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 12px; 
              padding: 12px; 
              width: 58mm; 
              margin: 0; 
              color: #000; 
              line-height: 1.2;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
            .header-title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            td { font-size: 11px; vertical-align: top; }
          </style>
        </head>
        <body>
          <div class="center header-title">O MUNDO DOS PERFUMES</div>
          <div class="center">SISTEMA DE GESTÃO & PDV</div>
          <div class="divider"></div>
          <div>DATA: ${new Date(dadosUltimaVenda.data).toLocaleString('pt-BR')}</div>
          <div class="divider"></div>
          <div class="bold">ITENS VENDIDOS:</div>
          <table>
            <tbody>
              ${dadosUltimaVenda.itens.map((item: any) => `
                <tr>
                  <td>${item.quantidade}x ${item.nome.substring(0, 16)}</td>
                  <td class="right">R$ ${(item.quantidade * item.precoVenda).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="right bold" style="font-size: 13px;">TOTAL: R$ ${dadosUltimaVenda.total.toFixed(2)}</div>
          <div class="divider"></div>
          <div class="center bold" style="margin-top: 8px;">OBRIGADO PELA PREFERÊNCIA!</div>
          <div class="center">VOLTE SEMPRE ✨</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const handleFecharCaixa = async () => {
    if(confirm('Tem certeza que deseja fechar o caixa do dia?')) {
      await fecharCaixa(caixa.id, caixa.saldoInicial + totalCompra);
      setCaixa(null);
    }
  };

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold">Carregando Caixa...</div>;

  if (!caixa) {
    return (
      <div className="max-w-md mx-auto mt-10 md:mt-20 bg-white p-6 md:p-8 rounded-xl shadow-xl border border-[#E0DDDD] text-center">
        <div className="text-5xl mb-4 animate-pulse">🔒</div>
        <h2 className="text-2xl font-black text-[#6A283A] mb-2">Caixa Fechado</h2>
        <p className="text-zinc-500 mb-6 font-medium text-sm md:text-base">Para começar a vender, precisamos abrir o caixa informando o troco inicial.</p>
        <form action={abrirCaixa} onSubmit={() => setTimeout(() => window.location.reload(), 1000)}>
          <label className="block text-left text-sm font-bold text-[#6A283A] mb-2">Troco/Saldo Inicial (R$)</label>
          <input name="saldoInicial" type="number" step="0.01" defaultValue="0" required className="w-full p-3 border border-[#E0DDDD] bg-[#E0DDDD]/10 focus:ring-[#6A283A] focus:border-[#6A283A] rounded-lg mb-6 outline-none transition-all text-center text-xl font-bold" />
          <button type="submit" className="w-full bg-[#6A283A] text-white font-black py-3 md:py-4 px-4 rounded-lg hover:bg-[#521e2d] transition-all uppercase tracking-wide shadow-md flex justify-center items-center gap-2">
            <span>🔑</span> Abrir Caixa
          </button>
        </form>
      </div>
    );
  }

  // 📝 TELA INTERMEDIÁRIA DE SUCESSO E IMPRESSÃO DE RECIBO
  if (vendaSucesso) {
    return (
      <div className="max-w-md mx-auto mt-10 md:mt-20 bg-white p-8 rounded-2xl shadow-xl border border-green-200 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-green-200 animate-bounce">
          ✓
        </div>
        <h2 className="text-2xl font-black text-green-800 uppercase tracking-wide">Venda Finalizada!</h2>
        <p className="text-zinc-600 font-medium text-sm mt-2 mb-6">O estoque já foi atualizado e os valores foram computados no caixa do dia.</p>
        
        <div className="space-y-3">
          <button 
            onClick={dispararImpressaoTermica}
            className="w-full bg-[#6A283A] text-white font-black py-4 px-4 rounded-xl hover:bg-[#521e2d] transition-all uppercase tracking-wider shadow-md flex justify-center items-center gap-2 text-base active:scale-95"
          >
            🖨️ Imprimir Recibo Térmico
          </button>
          
          <button 
            onClick={() => setVendaSucesso(false)}
            className="w-full bg-zinc-100 text-zinc-700 font-bold py-3 px-4 rounded-xl hover:bg-zinc-200 transition-all uppercase tracking-wide text-sm active:scale-95"
          >
            🛒 Iniciar Próxima Venda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6">
      
      {/* Assistente */}
      <div className="bg-gradient-to-r from-blue-50 to-white p-4 md:p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="bg-blue-600 p-3 rounded-full animate-pulse shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl text-white">🛍️</span>
        </div>
        <div className="flex-1">
          <h3 className="font-black text-blue-800 text-lg uppercase tracking-wide">Caixa Ativo</h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mt-2 text-sm text-blue-900/80 font-medium">
            <span className="flex items-center gap-2">👉 <span>Toque nos produtos</span></span>
            <span className="flex items-center gap-2">🛒 <span>Confira no cupom</span></span>
            <span className="flex items-center gap-2">🖨️ <span>Imprima o recibo no final</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 h-full">
        {/* Catálogo de Produtos */}
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 border-b border-[#E0DDDD]/50 pb-4">
            <h2 className="text-xl md:text-2xl font-black text-[#6A283A]">Catálogo de Produtos</h2>
            <span className="text-xs md:text-sm px-4 py-1.5 bg-green-100 text-green-800 rounded-full font-bold shadow-sm border border-green-200 w-fit flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div> Caixa Aberto
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {produtos.map((p) => (
              <button 
                key={p.id} 
                onClick={() => adicionarAoCarrinho(p)}
                disabled={p.estoque <= 0}
                className={`group relative p-3 md:p-4 border rounded-xl text-left transition-all overflow-hidden ${p.estoque > 0 ? 'border-[#E0DDDD] hover:border-[#6A283A] hover:shadow-md bg-white hover:bg-[#EED9D4]/10 active:bg-[#EED9D4]/30 active:scale-95' : 'opacity-50 bg-zinc-50 border-zinc-200 cursor-not-allowed'}`}
              >
                <div className="absolute inset-0 bg-[#6A283A]/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <h3 className="font-bold text-zinc-900 text-sm md:text-base line-clamp-2 md:line-clamp-1 relative z-10">{p.nome}</h3>
                <p className="text-[10px] md:text-xs font-medium text-zinc-500 mt-1 relative z-10">Estoque: <strong className={p.estoque <= 5 ? "text-red-500" : ""}>{p.estoque}</strong></p>
                <p className="text-base md:text-lg font-black text-[#6A283A] mt-2 relative z-10">R$ {p.precoVenda.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cupom de Venda */}
        <div className="bg-[#6A283A] text-white p-4 md:p-6 rounded-xl shadow-2xl flex flex-col h-auto lg:h-[calc(100vh-14rem)] lg:sticky lg:top-8 border border-[#521e2d] mt-2 lg:mt-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

          <h2 className="text-lg md:text-xl font-black border-b border-white/20 pb-4 mb-4 text-[#EED9D4] uppercase tracking-wider relative z-10 flex items-center justify-between">
            Cupom de Venda
            <span className="text-xs bg-white/10 px-2 py-1 rounded-md">{carrinho.length} Itens</span>
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-64 lg:max-h-full relative z-10">
            {carrinho.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#EED9D4]/40 mt-6 md:mt-10">
                <span className="text-4xl mb-2">🛒</span>
                <p className="font-medium text-sm text-center">O carrinho está vazio.</p>
              </div>
            ) : (
              carrinho.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-white/10 p-3 rounded-lg border border-white/5 animate-in fade-in zoom-in duration-200">
                  <div>
                    <p className="font-bold text-white text-sm md:text-base leading-tight">{item.nome}</p>
                    <p className="text-xs text-[#EED9D4] mt-1"><strong className="text-white bg-white/20 px-1.5 py-0.5 rounded">{item.quantidade}x</strong> R$ {item.precoVenda.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-white text-sm md:text-base">R$ {(item.quantidade * item.precoVenda).toFixed(2)}</span>
                    <button onClick={() => removerDoCarrinho(item.id)} className="text-[#EED9D4] bg-white/5 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors active:scale-90 shadow-sm">✖</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-white/20 pt-4 mt-4 relative z-10">
            <div className="flex justify-between items-end mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
              <span className="text-[#EED9D4] font-bold text-xs md:text-sm uppercase">Total a Pagar</span>
              <span className="text-3xl md:text-4xl font-black text-white">R$ {totalCompra.toFixed(2)}</span>
            </div>

            <button 
              onClick={handleFinalizarVenda}
              disabled={carrinho.length === 0}
              className="w-full bg-[#EED9D4] text-[#6A283A] font-black py-4 rounded-xl hover:bg-white active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed mb-3 transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(238,217,212,0.3)] text-sm md:text-base active:scale-95"
            >
              Finalizar Venda
            </button>
            
            <button 
              onClick={handleFecharCaixa}
              className="w-full bg-transparent text-[#EED9D4]/70 font-bold py-3 md:py-4 rounded-xl hover:bg-red-900/50 hover:text-white transition-colors border border-dashed border-[#EED9D4]/30 hover:border-red-500 text-sm md:text-base flex justify-center items-center gap-2"
            >
              <span>🔒</span> Fechar Caixa do Dia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}