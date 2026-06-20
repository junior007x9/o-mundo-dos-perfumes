// app/dashboard/produtos/InputPesquisa.tsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect, useRef } from 'react';

export default function InputPesquisa() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [termo, setTermo] = useState(searchParams.get('q') || '');
  
  // 🚀 NOVO: Estado para controlar o filtro de Estoque
  const [filtroEstoque, setFiltroEstoque] = useState(searchParams.get('estoque') || 'todos');

  const isFirstRender = useRef(true);

  // Sincroniza com a URL caso mude por fora
  useEffect(() => {
    setTermo(searchParams.get('q') || '');
    setFiltroEstoque(searchParams.get('estoque') || 'todos');
  }, [searchParams]);

  // Aciona a filtragem 300ms após parar de digitar ou ao mudar a caixa de seleção
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (termo) params.set('q', termo);
      else params.delete('q');

      // 🚀 NOVO: Passa o filtro de estoque para a URL
      if (filtroEstoque !== 'todos') params.set('estoque', filtroEstoque);
      else params.delete('estoque');

      // Remove as mensagens de alerta da URL ao pesquisar
      params.delete('msg');
      params.delete('erro');

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo, filtroEstoque]); 

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
      
      {/* Campo de Texto Original */}
      <div className="flex items-center w-full sm:w-80 bg-zinc-50 border border-[#E0DDDD] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#6A283A] transition-all shadow-sm">
        <input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Pesquisar por nome ou código..."
          className="w-full px-3 py-2.5 bg-transparent outline-none font-bold text-sm text-zinc-800 placeholder:font-medium placeholder:text-zinc-400"
        />
        {termo && (
          <button 
            onClick={() => setTermo('')} 
            className="p-2 text-zinc-400 hover:text-red-500 transition-colors flex items-center" 
            title="Limpar busca"
            type="button"
          >
            ✖
          </button>
        )}
        <div className="bg-[#6A283A] text-white px-4 py-2.5 font-black transition-colors flex items-center justify-center">
          {isPending ? <span className="animate-spin text-sm">⏳</span> : '🔍'}
        </div>
      </div>

      {/* 🚀 NOVO: Filtro Rápido de Estoque */}
      <select 
        value={filtroEstoque}
        onChange={(e) => setFiltroEstoque(e.target.value)}
        className="w-full sm:w-auto px-4 py-2.5 bg-zinc-50 border border-[#E0DDDD] rounded-xl outline-none font-bold text-sm text-zinc-800 focus:ring-2 focus:ring-[#6A283A] shadow-sm cursor-pointer"
      >
        <option value="todos">📦 Todos os Itens</option>
        <option value="com_estoque">✅ Com Estoque</option>
        <option value="sem_estoque">❌ Sem Estoque (Falta)</option>
      </select>

    </div>
  );
}