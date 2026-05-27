import { db } from '@/db';
import { produtos } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { desc } from 'drizzle-orm';

export default async function ProdutosPage() {
  // Busca os produtos cadastrados no Turso, ordenando do mais recente para o mais antigo
  const listaProdutos = await db.select().from(produtos).orderBy(desc(produtos.id));

  // Ação para salvar no banco
  async function salvarProduto(formData: FormData) {
    'use server';
    await db.insert(produtos).values({
      nome: formData.get('nome') as string,
      descricao: formData.get('descricao') as string,
      precoCusto: Number(formData.get('precoCusto')),
      precoVenda: Number(formData.get('precoVenda')),
      estoque: Number(formData.get('estoque')),
    });
    revalidatePath('/dashboard/produtos'); // Atualiza a tela automaticamente
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#6A283A]">Produtos & Estoque</h1>
        <p className="text-zinc-500 mt-1">Gerencie os perfumes e o inventário da loja</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo: Formulário de Cadastro */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] h-fit sticky top-8">
          <h2 className="text-xl font-bold text-[#6A283A] mb-6">Cadastrar Novo Perfume</h2>
          
          <form action={salvarProduto} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">Nome do Perfume</label>
              <input 
                name="nome" 
                required 
                className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-colors" 
                placeholder="Ex: 212 VIP Rose" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">Descrição / Marca</label>
              <input 
                name="descricao" 
                className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-colors" 
                placeholder="Ex: Carolina Herrera - 100ml" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#6A283A] mb-1">Custo (R$)</label>
                <input 
                  name="precoCusto" 
                  type="number" 
                  step="0.01" 
                  required 
                  className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-colors" 
                  placeholder="0,00" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6A283A] mb-1">Venda (R$)</label>
                <input 
                  name="precoVenda" 
                  type="number" 
                  step="0.01" 
                  required 
                  className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-colors" 
                  placeholder="0,00" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">Estoque Inicial (Unidades)</label>
              <input 
                name="estoque" 
                type="number" 
                required 
                className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-colors" 
                placeholder="Ex: 10" 
              />
            </div>

            <button 
              type="submit" 
              className="w-full mt-2 bg-[#6A283A] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#521e2d] transition-all shadow-md uppercase tracking-wide"
            >
              Adicionar ao Estoque
            </button>
          </form>
        </div>

        {/* Lado Direito: Lista de Produtos */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-bold text-[#6A283A] mb-6">Estoque Atual</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-[#E0DDDD]">
                  <th className="p-3 text-sm font-bold text-zinc-600">Produto</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">Preço (Venda)</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">Estoque</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {listaProdutos.map((p) => (
                  <tr key={p.id} className="border-b border-[#E0DDDD]/50 hover:bg-[#EED9D4]/20 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-zinc-800">{p.nome}</p>
                      <p className="text-xs text-zinc-500">{p.descricao}</p>
                    </td>
                    <td className="p-3 font-black text-green-600">
                      R$ {p.precoVenda.toFixed(2)}
                    </td>
                    <td className="p-3 font-bold text-zinc-700">
                      {p.estoque} un.
                    </td>
                    <td className="p-3">
                      {p.estoque > 5 ? (
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                          Adequado
                        </span>
                      ) : p.estoque > 0 ? (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                          Baixo
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full border border-red-200">
                          Esgotado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                
                {/* Mensagem caso não tenha nenhum produto cadastrado */}
                {listaProdutos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500 border-2 border-dashed border-[#E0DDDD] rounded-xl mt-4">
                      Nenhum perfume cadastrado ainda. <br/> Use o formulário ao lado para adicionar o primeiro produto da sua loja!
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