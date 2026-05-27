'use client';

import { useState, useEffect } from 'react';
import { getCaixaAberto, getProdutosPDV, abrirCaixa, fecharCaixa, finalizarVenda } from './actions';

export default function CaixaPage() {
  const [caixa, setCaixa] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

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
    await finalizarVenda(caixa.id, carrinho, totalCompra);
    setCarrinho([]);
    alert('Venda finalizada com sucesso!');
    const novaLista = await getProdutosPDV();
    setProdutos(novaLista);
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
        <h2 className="text-2xl font-black text-[#6A283A] mb-4">Caixa Fechado</h2>
        <p className="text-zinc-500 mb-6 font-medium text-sm md:text-base">Abra o caixa para iniciar as vendas do dia.</p>
        <form action={abrirCaixa} onSubmit={() => setTimeout(() => window.location.reload(), 1000)}>
          <label className="block text-left text-sm font-bold text-[#6A283A] mb-2">Troco/Saldo Inicial (R$)</label>
          <input name="saldoInicial" type="number" step="0.01" defaultValue="0" required className="w-full p-3 border border-[#E0DDDD] bg-[#E0DDDD]/10 focus:ring-[#6A283A] focus:border-[#6A283A] rounded-lg mb-6 outline-none transition-all" />
          <button type="submit" className="w-full bg-[#6A283A] text-white font-black py-3 md:py-4 px-4 rounded-lg hover:bg-[#521e2d] transition-all uppercase tracking-wide shadow-md">
            Abrir Caixa
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 h-full">
      
      {/* Lado Esquerdo: Lista de Perfumes */}
      <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
          <h2 className="text-xl md:text-2xl font-black text-[#6A283A]">Frente de Caixa</h2>
          <span className="text-xs md:text-sm px-4 py-1.5 bg-green-100 text-green-800 rounded-full font-bold shadow-sm border border-green-200 w-fit">Caixa Aberto</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          {produtos.map((p) => (
            <button 
              key={p.id} 
              onClick={() => adicionarAoCarrinho(p)}
              disabled={p.estoque <= 0}
              className={`p-3 md:p-4 border rounded-xl text-left transition-all ${p.estoque > 0 ? 'border-[#E0DDDD] hover:border-[#6A283A] hover:shadow-md bg-white hover:bg-[#EED9D4]/10 active:bg-[#EED9D4]/30' : 'opacity-50 bg-zinc-50 border-zinc-200 cursor-not-allowed'}`}
            >
              <h3 className="font-bold text-zinc-900 text-sm md:text-base line-clamp-2 md:line-clamp-1">{p.nome}</h3>
              <p className="text-[10px] md:text-xs font-medium text-zinc-500 mt-1">Estoque: {p.estoque}</p>
              <p className="text-base md:text-lg font-black text-[#6A283A] mt-2">R$ {p.precoVenda.toFixed(2)}</p>
            </button>
          ))}
          {produtos.length === 0 && (
            <div className="col-span-full p-8 text-center text-zinc-500 border-2 border-dashed border-[#E0DDDD] rounded-xl text-sm">
              Nenhum produto cadastrado no estoque ainda.
            </div>
          )}
        </div>
      </div>

      {/* Lado Direito: Carrinho e Checkout */}
      <div className="bg-[#6A283A] text-white p-4 md:p-6 rounded-xl shadow-2xl flex flex-col h-auto lg:h-[calc(100vh-8rem)] lg:sticky lg:top-8 border border-[#521e2d] mt-2 lg:mt-0">
        <h2 className="text-lg md:text-xl font-black border-b border-white/20 pb-4 mb-4 text-[#EED9D4] uppercase tracking-wider">Cupom de Venda</h2>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-64 lg:max-h-full">
          {carrinho.length === 0 ? (
            <p className="text-[#EED9D4]/60 text-center mt-6 md:mt-10 font-medium text-sm">Nenhum item adicionado.</p>
          ) : (
            carrinho.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-white/10 p-3 rounded-lg border border-white/5">
                <div>
                  <p className="font-bold text-white text-sm md:text-base">{item.nome}</p>
                  <p className="text-xs text-[#EED9D4]">{item.quantidade}x R$ {item.precoVenda.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-white text-sm md:text-base">R$ {(item.quantidade * item.precoVenda).toFixed(2)}</span>
                  <button onClick={() => removerDoCarrinho(item.id)} className="text-[#EED9D4] hover:text-red-400 transition-colors p-2 md:p-1 active:scale-90">✖</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/20 pt-4 mt-4">
          <div className="flex justify-between items-end mb-6">
            <span className="text-[#EED9D4] font-bold text-xs md:text-sm uppercase">Total a Pagar</span>
            <span className="text-3xl md:text-4xl font-black text-white">R$ {totalCompra.toFixed(2)}</span>
          </div>

          <button 
            onClick={handleFinalizarVenda}
            disabled={carrinho.length === 0}
            className="w-full bg-[#EED9D4] text-[#6A283A] font-black py-4 rounded-lg hover:bg-white active:bg-white disabled:opacity-50 disabled:cursor-not-allowed mb-3 transition-colors uppercase tracking-wide shadow-lg text-sm md:text-base"
          >
            FINALIZAR VENDA
          </button>
          
          <button 
            onClick={handleFecharCaixa}
            className="w-full bg-black/20 text-[#EED9D4] font-bold py-3 md:py-4 rounded-lg hover:bg-red-600 hover:text-white transition-colors border border-transparent hover:border-red-700 text-sm md:text-base"
          >
            Fechar Caixa do Dia
          </button>
        </div>
      </div>

    </div>
  );
}