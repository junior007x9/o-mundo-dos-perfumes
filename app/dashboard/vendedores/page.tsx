import { db } from '@/db';
import { vendedores } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export default async function VendedoresPage() {
  const listaVendedores = await db.select().from(vendedores).orderBy(desc(vendedores.id));

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
    <div className="space-y-6 md:space-y-8">
      
      {/* 💡 ASSISTENTE INTELIGENTE (TUTORIAL ANIMADO) */}
      <div className="bg-gradient-to-r from-purple-50 to-white p-4 md:p-5 rounded-2xl border border-purple-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="bg-purple-600 p-3 rounded-full animate-pulse shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl text-white">🛡️</span>
        </div>
        <div className="flex-1">
          <h3 className="font-black text-purple-900 text-lg uppercase tracking-wide">Como gerenciar a equipe?</h3>
          <p className="text-purple-800/80 text-sm mt-1 font-medium leading-relaxed">
            <strong>1.</strong> Crie o acesso (e-mail e senha) para cada novo funcionário.<br/>
            <strong>2.</strong> Atenção ao <strong>Nível de Acesso</strong>!<br/>
            <strong>3.</strong> Apenas os "Administradores" devem ter acesso total a exclusões e relatórios financeiros profundos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Formulário */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD] h-fit lg:sticky lg:top-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#6A283A]"></div>
          
          <h2 className="text-xl font-black text-[#6A283A] mb-6 flex items-center gap-2">
            <span>👔</span> Novo Vendedor
          </h2>
          
          <form action={salvarVendedor} className="space-y-4 md:space-y-5">
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Nome Completo</label>
              <input name="nome" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="Nome do Funcionário" />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">E-mail de Acesso</label>
              <input name="email" type="email" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="vendedor@loja.com" />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Senha Provisória</label>
              <input name="senha" type="password" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="••••••••" />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Nível de Acesso</label>
              <select name="cargo" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm font-bold text-zinc-700">
                <option value="vendedor">Vendedor Padrão</option>
                <option value="admin">Administrador Geral</option>
              </select>
            </div>
            
            <button type="submit" className="w-full mt-4 bg-[#6A283A] text-white font-black py-3 md:py-4 px-4 rounded-lg hover:bg-[#521e2d] transition-all shadow-md uppercase tracking-wide flex justify-center items-center gap-2 active:scale-95 text-sm md:text-base">
              Liberar Acesso
            </button>
          </form>
        </div>

        {/* Tabela */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-black text-[#6A283A] mb-6 flex items-center gap-2">
            <span>🔑</span> Usuários Cadastrados
          </h2>
          
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left whitespace-nowrap md:whitespace-normal">
              <thead>
                <tr className="bg-[#E0DDDD]/30 border-b border-[#E0DDDD]">
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Nome</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">E-mail</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Cargo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0DDDD]/50">
                {listaVendedores.map((v) => (
                  <tr key={v.id} className="hover:bg-[#EED9D4]/10 transition-colors">
                    <td className="p-3 font-bold text-zinc-800 text-sm md:text-base">{v.nome}</td>
                    <td className="p-3 text-sm text-zinc-600 font-medium">{v.email}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-md text-[10px] md:text-xs font-black uppercase tracking-wider border ${v.cargo === 'admin' ? 'bg-[#6A283A] text-white border-[#6A283A]' : 'bg-[#EED9D4]/50 text-[#6A283A] border-[#6A283A]/20'}`}>
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