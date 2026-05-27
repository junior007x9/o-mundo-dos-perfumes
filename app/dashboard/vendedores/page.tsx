import { db } from '@/db';
import { vendedores } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export default async function VendedoresPage() {
  const listaVendedores = await db.select().from(vendedores);

  async function salvarVendedor(formData: FormData) {
    'use server';
    const senha = formData.get('senha') as string;
    const hash = await bcrypt.hash(senha, 10);

    await db.insert(vendedores).values({
      nome: formData.get('nome') as string,
      email: formData.get('email') as string,
      senhaHash: hash,
      cargo: formData.get('cargo') as string,
    });
    revalidatePath('/dashboard/vendedores');
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#6A283A]">Gestão da Equipe</h1>
        <p className="text-zinc-500 mt-1">Controle os acessos ao sistema e os cargos dos vendedores</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Formulário */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD] h-fit">
          <h2 className="text-xl font-bold text-[#6A283A] mb-6">Novo Usuário</h2>
          <form action={salvarVendedor} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">Nome do Vendedor</label>
              <input name="nome" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10" placeholder="Nome Completo" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">E-mail de Acesso</label>
              <input name="email" type="email" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10" placeholder="vendedor@loja.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">Senha Provisória</label>
              <input name="senha" type="password" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6A283A] mb-1">Nível de Acesso</label>
              <select name="cargo" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-white">
                <option value="vendedor">Vendedor Padrão</option>
                <option value="admin">Administrador Geral</option>
              </select>
            </div>
            <button type="submit" className="w-full mt-2 bg-[#6A283A] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#521e2d] transition-all shadow-md uppercase tracking-wide">
              Liberar Acesso
            </button>
          </form>
        </div>

        {/* Tabela */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-bold text-[#6A283A] mb-6">Usuários Cadastrados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-[#E0DDDD]">
                  <th className="p-3 text-sm font-bold text-zinc-600">Nome</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">E-mail</th>
                  <th className="p-3 text-sm font-bold text-zinc-600">Cargo</th>
                </tr>
              </thead>
              <tbody>
                {listaVendedores.map((v) => (
                  <tr key={v.id} className="border-b border-[#E0DDDD]/50 hover:bg-[#EED9D4]/20 transition-colors">
                    <td className="p-3 font-bold text-zinc-800">{v.nome}</td>
                    <td className="p-3 text-sm text-zinc-500">{v.email}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${v.cargo === 'admin' ? 'bg-[#6A283A] text-white' : 'bg-[#EED9D4] text-[#6A283A] border border-[#6A283A]/20'}`}>
                        {v.cargo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}