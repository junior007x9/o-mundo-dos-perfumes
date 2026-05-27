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
    <div className="space-y-6 md:space-y-8">
      
      {/* 💡 ASSISTENTE INTELIGENTE (TUTORIAL ANIMADO) */}
      <div className="bg-gradient-to-r from-pink-50 to-white p-4 md:p-5 rounded-2xl border border-pink-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="bg-pink-500 p-3 rounded-full animate-bounce shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl text-white">🎁</span>
        </div>
        <div className="flex-1">
          <h3 className="font-black text-pink-900 text-lg uppercase tracking-wide">Como fidelizar clientes?</h3>
          <p className="text-pink-800/80 text-sm mt-1 font-medium leading-relaxed">
            <strong>1.</strong> Cadastre o cliente e o WhatsApp de contato no momento da venda.<br/>
            <strong>2.</strong> Não esqueça a <strong>Data de Aniversário</strong>!<br/>
            <strong>3.</strong> Use esta lista futuramente para enviar cupons e mensagens de parabéns.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Formulário */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD] h-fit lg:sticky lg:top-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#6A283A]"></div>
          
          <h2 className="text-xl font-black text-[#6A283A] mb-6 flex items-center gap-2">
            <span>👤</span> Novo Cliente
          </h2>
          
          <form action={salvarCliente} className="space-y-4 md:space-y-5">
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Nome Completo</label>
              <input name="nome" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="Ex: Maria Antonieta" />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">WhatsApp</label>
              <input name="telefone" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="(00) 00000-0000" />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">E-mail</label>
              <input name="email" type="email" className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" placeholder="cliente@email.com" />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-[#6A283A] mb-1">Data de Aniversário</label>
              <input name="dataNascimento" type="date" required className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] focus:border-[#6A283A] outline-none bg-[#E0DDDD]/10 transition-all focus:bg-white text-sm" />
            </div>
            
            <button type="submit" className="w-full mt-4 bg-[#6A283A] text-white font-black py-3 md:py-4 px-4 rounded-lg hover:bg-[#521e2d] transition-all shadow-md uppercase tracking-wide flex justify-center items-center gap-2 active:scale-95 text-sm md:text-base">
              Salvar Cliente
            </button>
          </form>
        </div>

        {/* Tabela */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-black text-[#6A283A] mb-6 flex items-center gap-2">
            <span>👥</span> Base de Clientes
          </h2>
          
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left whitespace-nowrap md:whitespace-normal">
              <thead>
                <tr className="bg-[#E0DDDD]/30 border-b border-[#E0DDDD]">
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Nome</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Contato</th>
                  <th className="p-3 text-xs md:text-sm font-black text-[#6A283A] uppercase tracking-wider">Aniversário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0DDDD]/50">
                {listaClientes.map((c) => (
                  <tr key={c.id} className="hover:bg-[#EED9D4]/10 transition-colors">
                    <td className="p-3 font-bold text-zinc-800 text-sm md:text-base">{c.nome}</td>
                    <td className="p-3 text-sm text-zinc-600">
                      <span className="flex items-center gap-1">📱 {c.telefone || '-'}</span>
                      <span className="text-[10px] md:text-xs text-zinc-400 block mt-0.5">{c.email}</span>
                    </td>
                    <td className="p-3">
                      <span className="bg-[#EED9D4]/40 text-[#6A283A] text-xs md:text-sm font-black px-3 py-1 rounded-full border border-[#6A283A]/10">
                        {c.dataNascimento ? new Date(c.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
                {listaClientes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-zinc-500">
                       <div className="text-4xl mb-3 opacity-50">📝</div>
                       <p className="font-medium text-sm">Nenhum cliente na base de dados.</p>
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