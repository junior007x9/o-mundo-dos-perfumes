import { db } from '@/db';
import { produtos } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { desc } from 'drizzle-orm';

export default async function ProdutosPage() {
  const listaProdutos = await db.select().from(produtos).orderBy(desc(produtos.id));

  async function salvarProduto(formData: FormData) {
    'use server';
    await db.insert(produtos).values({
      nome: formData.get('nome') as string,
      descricao: formData.get('descricao') as string,
      precoCusto: Number(formData.get('precoCusto')),
      precoVenda: Number(formData.get('precoVenda')),
      estoque: Number(formData.get('estoque')),
    });
    revalidatePath('/dashboard/produtos');
  }

  return (
    <div className="space-y-6 md:space-y-8">
      
      {/* 💡 ASSISTENTE INTELIGENTE (TUTORIAL ANIMADO DE ESTOQUE) */}
      <div className="bg-gradient-to-r from-amber-50 to-white p-4 md:p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="bg-amber-500 p-3 rounded-full animate-bounce shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl text-white">📦</span>
        </div>
        <div className="flex-1">
          <h3 className="font-black text-amber-900 text-lg uppercase tracking-wide">Como gerenciar o estoque?</h3>
          <p className="text-amber-800/80 text-sm mt-1 font-medium leading-relaxed">
            <strong>1.</strong> Preencha o formulário à esquerda para cadastrar um novo perfume. <br/>
            <strong>2.</strong> Ele aparecerá automaticamente na tabela à direita. <br/>
            <strong>3.</strong> Fique de olho na coluna "Status": O sistema avisa sozinho quando o estoque está baixo ou esgotado!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Lado Esquerdo: Formulário */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD] h-fit lg:sticky lg:top-8 relative overflow-hidden">
          {/* Faixa decorativa no topo do card */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#6A283A]"></div>
          
          <h2 className="text-xl font-black text-[#6A283A] mb-6 flex items-center gap-2">
            <span>➕</span> Cadastrar Perfume
          </h2>
          
          <form action={salvarProduto} className="space-y-4 md:space-y-5">
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
                <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Custo (R$)</label>
                <input name="precoCusto" type="number" step="0.01" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Venda (R$)</label>
                <input name="precoVenda" type="number" step="0.01" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="0,00" />
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

        {/* Lado Direito: Lista */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-black text-[#6A283A] mb-6 flex items-center gap-2">
            <span>📋</span> Estoque Atual
          </h2>
          
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left whitespace-nowrap md:whitespace-normal">
              <thead>
                <tr className="bg-[#E0DDDD]/30 border-b border-[#E0DDDD]">
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Produto</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Preço</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0DDDD]/50">
                {listaProdutos.map((p) => (
                  <tr key={p.id} className="hover:bg-[#EED9D4]/10 transition-colors group">
                    <td className="p-3">
                      <p className="font-bold text-zinc-800 text-sm md:text-base">{p.nome}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{p.descricao}</p>
                    </td>
                    <td className="p-3 font-black text-green-700 text-sm md:text-base">
                      R$ {p.precoVenda.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-zinc-700 text-xs md:text-sm">
                          {p.estoque} un.
                        </span>
                        {p.estoque > 5 ? (
                          <span className="bg-green-100 text-green-800 text-[10px] md:text-xs font-bold px-2 py-1 rounded-md border border-green-200 uppercase tracking-wide">
                            Adequado
                          </span>
                        ) : p.estoque > 0 ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] md:text-xs font-bold px-2 py-1 rounded-md border border-amber-200 uppercase tracking-wide animate-pulse">
                            Baixo
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 text-[10px] md:text-xs font-bold px-2 py-1 rounded-md border border-red-200 uppercase tracking-wide">
                            Esgotado
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {listaProdutos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center">
                      <div className="text-4xl mb-3 opacity-50">📭</div>
                      <p className="text-zinc-500 font-medium text-sm">Nenhum perfume cadastrado ainda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}