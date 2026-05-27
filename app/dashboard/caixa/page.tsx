'use client';

import { useState, useEffect, useRef } from 'react';
import { getCaixaAberto, getProdutosPDV, abrirCaixa, fecharCaixa, finalizarVenda } from './actions';
import { Html5QrcodeScanner } from 'html5-qrcode'; // Importa o leitor de câmera

export default function CaixaPage() {
  const [caixa, setCaixa] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  const [vendaSucesso, setVendaSucesso] = useState<boolean>(false);
  const [dadosUltimaVenda, setDadosUltimaVenda] = useState<any>(null);

  // Estados do Scanner
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

  // Inicia o leitor da câmera quando o modal é aberto
  useEffect(() => {
    if (cameraAberta) {
      const scanner = new Html5QrcodeScanner(
        "leitor-camera",
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false
      );
      scanner.render((codigoLido) => {
        scanner.clear(); // Fecha a câmera
        setCameraAberta(false);
        processarBuscaProduto(codigoLido); // Adiciona o produto lido
      }, () => {});
      
      return () => scanner.clear().catch(error => console.error("Falha ao limpar scanner", error));
    }
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
    
    // Procura por código de barras OU pelo nome
    const prodEncontrado = produtos.find(p => 
      p.codigoBarras === termoBusca || 
      p.nome.toLowerCase().includes(termoBusca.toLowerCase())
    );

    if (prodEncontrado) {
      adicionarAoCarrinho(prodEncontrado);
      setBuscaTexto(''); // Limpa o campo pro próximo bip
    } else {
      alert('Produto não encontrado!');
    }
    
    // Devolve o foco pro input da maquininha
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

  // Função de Impressão Térmica Omitida por brevidade (já adicionada no passo anterior)
  const dispararImpressaoTermica = () => { /* ... Manter o mesmo código que passei antes ... */ };
  const handleFecharCaixa = async () => { /* ... Manter o mesmo código ... */ };

  if (carregando) return <div className="p-8 text-center text-[#6A283A] font-bold">Carregando Caixa...</div>;

  // ... (Telas de Caixa Fechado e Venda Sucesso se mantêm iguais ao código anterior)

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6">
      
      {/* 🚀 BARRA DE BUSCA E LEITURA DE CÓDIGO DE BARRAS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E0DDDD] flex gap-3">
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
          className="flex-1 p-3 md:p-4 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-zinc-50 font-bold text-lg"
          autoFocus
        />
        <button 
          onClick={() => setCameraAberta(true)}
          className="bg-zinc-800 text-white px-6 rounded-lg font-bold hover:bg-black transition-colors flex items-center gap-2 shadow-md"
        >
          📷 <span className="hidden md:inline">Ler com Celular</span>
        </button>
      </div>

      {/* Modal da Câmera do Celular */}
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
        {/* Catálogo de Produtos Visual (Mantido para toque) */}
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

        {/* Cupom de Venda com Moeda Formatada */}
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