'use client';

import { useState } from 'react';
import { db } from '@/db';
import { produtos } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { useRouter } from 'next/navigation';

export default function ProdutosPage() {
  const router = useRouter();

  // Função para aplicar a Máscara de Dinheiro (R$ 0,00)
  const aplicarMascaraMoeda = (e: any) => {
    let valor = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
    valor = (Number(valor) / 100).toFixed(2) + '';
    valor = valor.replace('.', ',');
    valor = valor.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
    valor = valor.replace(/(\d)(\d{3}),/g, "$1.$2,");
    e.target.value = valor === '0,00' ? '' : valor;
  };

  const formataMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      
      <div className="bg-gradient-to-r from-amber-50 to-white p-4 md:p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="bg-amber-500 p-3 rounded-full animate-bounce shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl text-white">📦</span>
        </div>
        <div className="flex-1">
          <h3 className="font-black text-amber-900 text-lg uppercase tracking-wide">Novidade no Estoque!</h3>
          <p className="text-amber-800/80 text-sm mt-1 font-medium leading-relaxed">
            Agora você pode bipar o <strong>Código de Barras</strong> ao cadastrar o perfume! Na hora da venda, basta usar o leitor ou a câmera do celular para o produto ir direto pro carrinho. E os valores já estão formatados em Reais (R$).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Formulário */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD] h-fit lg:sticky lg:top-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#6A283A]"></div>
          
          <h2 className="text-xl font-black text-[#6A283A] mb-6 flex items-center gap-2">
            <span>➕</span> Cadastrar Perfume
          </h2>
          
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              // Transforma a string com vírgula de volta para número do banco de dados
              const parseMoeda = (val: string) => Number(val.replace(/\./g, '').replace(',', '.'));

              const dados = {
                nome: formData.get('nome') as string,
                descricao: formData.get('descricao') as string,
                codigoBarras: formData.get('codigoBarras') as string,
                precoCusto: parseMoeda(formData.get('precoCusto') as string),
                precoVenda: parseMoeda(formData.get('precoVenda') as string),
                estoque: Number(formData.get('estoque')),
              };

              // Chama a API para salvar (vamos fazer no cliente por simplicidade de import)
              await fetch('/api/produtos', { method: 'POST', body: JSON.stringify(dados) });
              router.refresh(); // Atualiza a página
              (e.target as HTMLFormElement).reset(); // Limpa o formulário
            }} 
            className="space-y-4 md:space-y-5"
          >
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Código de Barras (Opcional)</label>
              <input name="codigoBarras" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="Bipe aqui ou digite" />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Nome do Perfume</label>
              <input name="nome" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="Ex: 212 VIP Rose" />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Descrição / Marca</label>
              <input name="descricao" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="Ex: Carolina Herrera - 100ml" />
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Custo</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-zinc-500 font-bold">R$</span>
                  <input name="precoCusto" type="text" onChange={aplicarMascaraMoeda} required className="w-full pl-9 p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="0,00" />
                </div>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Venda</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-zinc-500 font-bold">R$</span>
                  <input name="precoVenda" type="text" onChange={aplicarMascaraMoeda} required className="w-full pl-9 p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="0,00" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Qtd. Inicial (Estoque)</label>
              <input name="estoque" type="number" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="Ex: 10" />
            </div>

            <button type="submit" className="w-full mt-4 bg-[#6A283A] text-white font-black py-3 md:py-4 px-4 rounded-lg hover:bg-[#521e2d] transition-all shadow-md uppercase tracking-wide flex justify-center items-center gap-2 active:scale-95 text-sm md:text-base">
              Salvar no Estoque
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}