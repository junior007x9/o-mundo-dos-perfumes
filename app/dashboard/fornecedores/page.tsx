import { db } from '@/db';
import { fornecedores } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { desc } from 'drizzle-orm';

export default async function FornecedoresPage() {
  const listaFornecedores = await db.select().from(fornecedores).orderBy(desc(fornecedores.id));

  async function salvarFornecedor(formData: FormData) {
    'use server';
    await db.insert(fornecedores).values({
      nomeFantasia: formData.get('nomeFantasia') as string,
      cnpj: formData.get('cnpj') as string,
      telefone: formData.get('telefone') as string,
    });
    revalidatePath('/dashboard/fornecedores');
  }

  return (
    <div className="space-y-6 md:space-y-8">
      
      {/* 💡 ASSISTENTE INTELIGENTE (TUTORIAL ANIMADO) */}
      <div className="bg-gradient-to-r from-emerald-50 to-white p-4 md:p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="bg-emerald-500 p-3 rounded-full animate-bounce shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl text-white">🚚</span>
        </div>
        <div className="flex-1">
          <h3 className="font-black text-emerald-900 text-lg uppercase tracking-wide">Como gerenciar fornecedores?</h3>
          <p className="text-emerald-800/80 text-sm mt-1 font-medium leading-relaxed">
            <strong>1.</strong> Salve as marcas e distribuidoras que abastecem a loja.<br/>
            <strong>2.</strong> Mantenha o contato rápido sempre à mão para repor mercadorias esgotadas.<br/>
            <strong>3.</strong> Nunca mais perca tempo procurando o número do fornecedor no WhatsApp!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Formulário */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD] h-fit lg:sticky lg:top-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#6A283A]"></div>
          
          <h2 className="text-xl font-black text-[#6A283A] mb-6 flex items-center gap-2">
            <span>🤝</span> Novo Parceiro
          </h2>
          
          <form action={salvarFornecedor} className="space-y-4 md:space-y-5">
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Empresa / Marca</label>
              <input name="nomeFantasia" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="Ex: Distribuidora Cosméticos" />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">CNPJ</label>
              <input name="cnpj" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="00.000.000/0000-00" />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Telefone (Pedido Rápido)</label>
              <input name="telefone" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="(00) 0000-0000" />
            </div>
            
            <button type="submit" className="w-full mt-4 bg-[#6A283A] text-white font-black py-3 md:py-4 px-4 rounded-lg hover:bg-[#521e2d] transition-all shadow-md uppercase tracking-wide flex justify-center items-center gap-2 active:scale-95 text-sm md:text-base">
              Cadastrar Parceiro
            </button>
          </form>
        </div>

        {/* Tabela */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-black text-[#6A283A] mb-6 flex items-center gap-2">
            <span>🏢</span> Lista de Fornecedores
          </h2>
          
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left whitespace-nowrap md:whitespace-normal">
              <thead>
                <tr className="bg-[#E0DDDD]/30 border-b border-[#E0DDDD]">
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Empresa / Marca</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">CNPJ</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Contato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0DDDD]/50">
                {listaFornecedores.map((f) => (
                  <tr key={f.id} className="hover:bg-[#EED9D4]/10 transition-colors">
                    <td className="p-3 font-bold text-zinc-800 text-sm md:text-base flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#6A283A] rounded-full"></div>
                      {f.nomeFantasia}
                    </td>
                    <td className="p-3 text-xs md:text-sm text-zinc-500 font-medium">{f.cnpj || '-'}</td>
                    <td className="p-3 text-sm md:text-base text-zinc-700 font-black">📞 {f.telefone || '-'}</td>
                  </tr>
                ))}
                {listaFornecedores.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-zinc-500">
                       <div className="text-4xl mb-3 opacity-50">📦</div>
                       <p className="font-medium text-sm">Ainda não há parceiros e fornecedores cadastrados.</p>
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