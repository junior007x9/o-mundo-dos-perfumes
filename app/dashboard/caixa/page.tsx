'use client';

import { useState, useEffect, useRef } from 'react';
import { getCaixaAberto, getProdutosPDV, abrirCaixa, fecharCaixa, finalizarVenda } from './actions';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function CaixaPage() {
  const [caixa, setCaixa] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  const [vendaSucesso, setVendaSucesso] = useState<boolean>(false);
  const [dadosUltimaVenda, setDadosUltimaVenda] = useState<any>(null);

  const [buscaTexto, setBuscaTexto] = useState('');
  const [cameraAberta, setCameraAberta] = useState(false);
  const inputBuscaRef = useRef<HTMLInputElement>(null);

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

  // CORREÇÃO: O TypeScript agora aceita a função de desligar a câmera perfeitamente
  useEffect(() => {
    if (cameraAberta) {
      const scanner = new Html5QrcodeScanner(
        "leitor-camera",
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false
      );
      scanner.render((codigoLido) => {
        scanner.clear();
        setCameraAberta(false);
        processarBuscaProduto(codigoLido);
      }, () => {});
      
      // Envelopamos o fechamento para não retornar uma Promise
      return () => {
        scanner.clear().catch(error => console.error("Falha ao limpar scanner", error));
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraAberta]);

  const formataMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

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

  const processarBuscaProduto = (termoBusca: string) => {
    if (!termoBusca.trim()) return;
    
    const prodEncontrado = produtos.find(p => 
      p.codigoBarras === termoBusca || 
      p.nome.toLowerCase().includes(termoBusca.toLowerCase())
    );

    if (prodEncontrado) {
      adicionarAoCarrinho(prodEncontrado);
      setBuscaTexto('');
    } else {
      alert('Produto não encontrado!');
    }
    
    if (inputBuscaRef.current) inputBuscaRef.current.focus();
  };

  const removerDoCarrinho = (id: number) => {
    setCarrinho(carrinho.filter(item => item.id !== id));
  };

  const totalCompra = carrinho.reduce((acc, item) => acc + (item.precoVenda * item.quantidade), 0);

  const handleFinalizarVenda = async () => {
    if (carrinho.length === 0) return;
    setDadosUltimaVenda({ itens: [...carrinho], total: totalCompra, data: new Date().toISOString() });
    await finalizarVenda(caixa.id, carrinho, totalCompra);
    setCarrinho([]);
    setVendaSucesso(true);
    const novaLista = await getProdutosPDV();
    setProdutos(novaLista);
  };

  const dispararImpressaoTermica = () => {
    if (!dadosUltimaVenda) return;

    const popup = window.open('', '_blank', 'width=300,height=600');
    if (!popup) {
      alert('Por favor, autorize pop-ups para realizar a impressão do cupom!');
      return;
    }

    const urlDaLogo = `${window.location.origin}/logo.png`;

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
              line-height: 1.3;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
            .header-title { font-size: 13px; font-weight: bold; margin-top: 4px; margin-bottom: 2px; }
            .logo-container { text-align: center; margin-bottom: 4px; }
            .logo-img { max-width: 32mm; height: auto; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            td { font-size: 11px; vertical-align: top; }
          </style>
        </head>
        <body>
          <div class="logo-container">
            <img src="${urlDaLogo}" class="logo-img" alt="Logo" />
          </div>
          <div class="center header-title">O MUNDO DOS PERFUMES</div>
          <div class="center" style="font-size: 10px;">SISTEMA DE GESTÃO & PDV</div>
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
            🖨️ Imprimir Recibo Personalizado
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
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E0DDDD] flex flex-col md:flex-row gap-3">
        <input 
          ref={inputBuscaRef}
          type="text"
          value={buscaTexto}
          onChange={(e) => setBuscaTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              processarBuscaProduto(buscaTexto);
            }
          }}
          placeholder="Bipe o código de barras ou digite o nome e aperte Enter..."
          className="flex-1 p-3 md:p-4 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-zinc-50 font-bold text-sm md:text-lg"
          autoFocus
        />
        <button 
          onClick={() => setCameraAberta(true)}
          className="bg-zinc-800 text-white px-6 py-3 md:py-0 rounded-lg font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-md w-full md:w-auto"
        >
          📷 <span>Ler com Celular</span>
        </button>
      </div>

      {cameraAberta && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-4 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Aponte para o Código</h3>
              <button onClick={() => setCameraAberta(false)} className="text-red-500 font-bold p-2">Fechar ✖</button>
            </div>
            <div id="leitor-camera" className="w-full rounded-lg overflow-hidden border-2 border-dashed border-[#E0DDDD]"></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 h-full">
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 border-b border-[#E0DDDD]/50 pb-4">
            <h2 className="text-xl md:text-2xl font-black text-[#6A283A]">Catálogo Rápido</h2>
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
                className={`group relative p-3 md:p-4 border rounded-xl text-left transition-all overflow-hidden ${p.estoque > 0 ? 'border-[#E0DDDD] hover:border-[#6A283A] hover:shadow-md bg-white hover:bg-[#EED9D4]/10' : 'opacity-50 bg-zinc-50 border-zinc-200 cursor-not-allowed'}`}
              >
                <h3 className="font-bold text-zinc-900 text-sm md:text-base line-clamp-2">{p.nome}</h3>
                <p className="text-[10px] md:text-xs font-medium text-zinc-500 mt-1">Estoque: {p.estoque}</p>
                <p className="text-base md:text-lg font-black text-[#6A283A] mt-2">{formataMoeda(p.precoVenda)}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#6A283A] text-white p-4 md:p-6 rounded-xl shadow-2xl flex flex-col h-auto lg:h-[calc(100vh-16rem)] lg:sticky lg:top-8 border border-[#521e2d] mt-2 lg:mt-0 relative overflow-hidden">
          <h2 className="text-lg md:text-xl font-black border-b border-white/20 pb-4 mb-4 text-[#EED9D4] uppercase flex items-center justify-between">
            Cupom de Venda
            <span className="text-xs bg-white/10 px-2 py-1 rounded-md">{carrinho.length} Itens</span>
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {carrinho.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-white/10 p-3 rounded-lg border border-white/5">
                <div>
                  <p className="font-bold text-white text-sm md:text-base leading-tight">{item.nome}</p>
                  <p className="text-xs text-[#EED9D4] mt-1"><strong className="text-white bg-white/20 px-1.5 py-0.5 rounded">{item.quantidade}x</strong> {formataMoeda(item.precoVenda)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-white text-sm md:text-base">{formataMoeda(item.quantidade * item.precoVenda)}</span>
                  <button onClick={() => removerDoCarrinho(item.id)} className="text-[#EED9D4] bg-white/5 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500">✖</button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/20 pt-4 mt-4">
            <div className="flex justify-between items-end mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
              <span className="text-[#EED9D4] font-bold text-xs md:text-sm uppercase">Total a Pagar</span>
              <span className="text-2xl md:text-3xl font-black text-white">{formataMoeda(totalCompra)}</span>
            </div>

            <button onClick={handleFinalizarVenda} disabled={carrinho.length === 0} className="w-full bg-[#EED9D4] text-[#6A283A] font-black py-4 rounded-xl hover:bg-white disabled:opacity-50 mb-3 uppercase tracking-wider text-sm md:text-base">
              Finalizar Venda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}