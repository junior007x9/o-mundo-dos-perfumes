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
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#6A283A]">Gestão de Fornecedores</h1>
        <p className="text-zinc-500 mt-1">Cadastre as marcas e distribuidoras parceiras da loja</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Formulário */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] h-fit">
          <h2 className="text-xl font-bold text-[#6A283A] mb-6">Novo Fornecedor</h2>
          <form action={salvarFornecedor} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">Nome Fantasia / Marca</label>
              <input name="nomeFantasia" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10" placeholder="Ex: Distribuidora Natura" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">CNPJ</label>
              <input name="cnpj" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10" placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">Telefone de Contato</label>
              <input name="telefone" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10" placeholder="(00) 0000-0000" />
            </div>
            <button type="submit" className="w-full mt-2 bg-[#6A283A] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#521e2d] transition-all shadow-md uppercase tracking-wide">
              Cadastrar Parceiro
            </button>
          </form>
        </div>

        {/* Tabela */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-bold text-[#6A283A] mb-6">Lista de Parceiros</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-[#E0DDDD]">
                  <th className="p-3 text-sm font-bold text-zinc-600">Empresa / Marca</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">CNPJ</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">Contato</th>
                </tr>
              </thead>
              <tbody>
                {listaFornecedores.map((f) => (
                  <tr key={f.id} className="border-b border-[#E0DDDD]/50 hover:bg-[#EED9D4]/20 transition-colors">
                    <td className="p-3 font-bold text-zinc-800">{f.nomeFantasia}</td>
                    <td className="p-3 text-sm text-zinc-600">{f.cnpj || '-'}</td>
                    <td className="p-3 text-sm text-zinc-600 font-medium">{f.telefone || '-'}</td>
                  </tr>
                ))}
                {listaFornecedores.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-zinc-500 border-2 border-dashed border-[#E0DDDD] rounded-xl mt-4">Nenhum fornecedor cadastrado.</td>
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