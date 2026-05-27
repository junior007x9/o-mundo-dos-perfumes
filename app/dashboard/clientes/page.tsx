import { db } from '@/db';
import { clientes } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { desc } from 'drizzle-orm';

export default async function ClientesPage() {
  const listaClientes = await db.select().from(clientes).orderBy(desc(clientes.id));

  async function salvarCliente(formData: FormData) {
    'use server';
    await db.insert(clientes).values({
      nome: formData.get('nome') as string,
      telefone: formData.get('telefone') as string,
      email: formData.get('email') as string,
      dataNascimento: formData.get('dataNascimento') as string,
    });
    revalidatePath('/dashboard/clientes');
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#6A283A]">Gestão de Clientes</h1>
        <p className="text-zinc-500 mt-1">Cadastre seus clientes para oferecer cupons de aniversário</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Formulário */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] h-fit">
          <h2 className="text-xl font-bold text-[#6A283A] mb-6">Novo Cliente</h2>
          <form action={salvarCliente} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">Nome Completo</label>
              <input name="nome" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10" placeholder="Nome do Cliente" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">WhatsApp</label>
              <input name="telefone" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">E-mail</label>
              <input name="email" type="email" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10" placeholder="cliente@email.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">Data de Aniversário</label>
              <input name="dataNascimento" type="date" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10" />
            </div>
            <button type="submit" className="w-full mt-2 bg-[#6A283A] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#521e2d] transition-all shadow-md uppercase tracking-wide">
              Cadastrar Cliente
            </button>
          </form>
        </div>

        {/* Tabela */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-bold text-[#6A283A] mb-6">Base de Clientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-[#E0DDDD]">
                  <th className="p-3 text-sm font-bold text-zinc-600">Nome</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">Contato</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">Aniversário</th>
                </tr>
              </thead>
              <tbody>
                {listaClientes.map((c) => (
                  <tr key={c.id} className="border-b border-[#E0DDDD]/50 hover:bg-[#EED9D4]/20 transition-colors">
                    <td className="p-3 font-bold text-zinc-800">{c.nome}</td>
                    <td className="p-3 text-sm text-zinc-600">
                      {c.telefone} <br/> <span className="text-xs text-zinc-400">{c.email}</span>
                    </td>
                    <td className="p-3 text-sm font-black text-[#6A283A]">
                      {c.dataNascimento ? new Date(c.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                    </td>
                  </tr>
                ))}
                {listaClientes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-zinc-500 border-2 border-dashed border-[#E0DDDD] rounded-xl mt-4">Nenhum cliente cadastrado.</td>
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