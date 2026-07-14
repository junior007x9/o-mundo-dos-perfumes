// app/dashboard/vendedores/page.tsx
import { db } from '@/db';
// 🚀 Importamos a tabela 'vendas' para garantir a proteção do histórico ao excluir!
import { vendedores, vendas } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import Link from 'next/link';

export default async function VendedoresPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ editId?: string, msg?: string }> 
}) {
  const params = await searchParams;
  const editId = params?.editId;
  const msgSucesso = params?.msg;

  const listaVendedores = await db.select().from(vendedores).orderBy(desc(vendedores.id));

  // Se a URL tiver um ID de edição, nós buscamos os dados dele
  let vendedorEditando = null;
  if (editId) {
    const res = await db.select().from(vendedores).where(eq(vendedores.id, Number(editId))).limit(1);
    vendedorEditando = res[0] || null;
  }

  // 🚀 LÓGICA MESTRA: SALVAR (Novo) OU ATUALIZAR (Existente)
  async function salvarVendedor(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;
    const senha = formData.get('senha') as string;
    const cargo = formData.get('cargo') as string;

    if (id) {
      // ✏️ MODO EDIÇÃO
      const dadosAtualizacao: any = { nome, email, cargo };
      
      // Só atualiza a senha se você tiver digitado uma nova!
      if (senha && senha.trim() !== '') {
        dadosAtualizacao.senhaHash = await bcrypt.hash(senha, 10);
      }

      await db.update(vendedores).set(dadosAtualizacao).where(eq(vendedores.id, Number(id)));
      redirect('/dashboard/vendedores?msg=Acesso do usuário atualizado com sucesso!');
    } else {
      // ➕ MODO NOVO VENDEDOR
      if (!senha) throw new Error("A senha é obrigatória para criar um novo acesso.");
      const hash = await bcrypt.hash(senha, 10);

      await db.insert(vendedores).values({
        nome,
        email,
        senhaHash: hash,
        cargo,
      });
      redirect('/dashboard/vendedores?msg=Novo funcionário cadastrado com sucesso!');
    }
  }

  // 🚀 LÓGICA MESTRA: EXCLUSÃO SEGURA (Sem quebrar o Financeiro)
  async function excluirVendedor(formData: FormData) {
    'use server';
    const idParaExcluir = Number(formData.get('idExcluir'));

    // 1º PASSO: Desvincula este vendedor de todas as vendas que ele já fez.
    // Isso garante que o valor faturado não desapareça do sistema!
    await db.update(vendas).set({ idVendedor: null }).where(eq(vendas.idVendedor, idParaExcluir));

    // 2º PASSO: Exclui definitivamente a conta de acesso.
    await db.delete(vendedores).where(eq(vendedores.id, idParaExcluir));

    redirect('/dashboard/vendedores?msg=Usuário removido! O histórico financeiro dele foi mantido intacto.');
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* BANNER DE SUCESSO */}
      {msgSucesso && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-r-xl shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <span className="font-bold text-sm md:text-base">{msgSucesso}</span>
          </div>
          <Link href="/dashboard/vendedores" className="text-green-600 hover:text-green-800 font-bold p-2 text-xl" title="Fechar">&times;</Link>
        </div>
      )}

      {/* 💡 ASSISTENTE INTELIGENTE (TUTORIAL ANIMADO) */}
      <div className="bg-gradient-to-r from-purple-50 to-white p-4 md:p-5 rounded-2xl border border-purple-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="bg-purple-600 p-3 rounded-full animate-pulse shadow-lg border-2 border-white flex-shrink-0">
          <span className="text-2xl text-white">🛡️</span>
        </div>
        <div className="flex-1">
          <h3 className="font-black text-purple-900 text-lg uppercase tracking-wide">Como gerenciar a equipe?</h3>
          <p className="text-purple-800/80 text-sm mt-1 font-medium leading-relaxed">
            <strong>1.</strong> Crie o acesso (e-mail e senha) para cada novo funcionário.<br/>
            <strong>2.</strong> Atenção ao <strong>Nível de Acesso</strong>! Apenas os "Administradores" devem ter acesso total a exclusões e relatórios financeiros.<br/>
            <strong>3.</strong> Para alterar a senha de alguém, clique em Editar e digite a nova senha.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Formulário (Dinâmico: Serve para Cadastrar e Editar) */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD] h-fit lg:sticky lg:top-8 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-1.5 ${vendedorEditando ? 'bg-amber-500' : 'bg-[#6A283A]'}`}></div>
          
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-black flex items-center gap-2 ${vendedorEditando ? 'text-amber-600' : 'text-[#6A283A]'}`}>
              {vendedorEditando ? <span>✏️ Editando Acesso</span> : <span>👔 Novo Vendedor</span>}
            </h2>
            {vendedorEditando && (
              <Link href="/dashboard/vendedores" className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-600 px-3 py-1.5 rounded-lg font-bold transition-colors">
                Cancelar
              </Link>
            )}
          </div>
          
          <form action={salvarVendedor} className="space-y-4 md:space-y-5">
            {/* Campo oculto que diz ao sistema se estamos a atualizar um ID existente */}
            <input type="hidden" name="id" value={vendedorEditando?.id || ''} />

            <div>
              <label className="block text-xs md:text-sm font-bold text-zinc-700 mb-1">Nome Completo</label>
              <input 
                name="nome" 
                defaultValue={vendedorEditando?.nome || ''}
                required 
                className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] outline-none bg-zinc-50 focus:bg-white text-sm font-bold transition-all" 
                placeholder="Nome do Funcionário" 
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-zinc-700 mb-1">E-mail de Acesso</label>
              <input 
                name="email" 
                type="email" 
                defaultValue={vendedorEditando?.email || ''}
                required 
                className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] outline-none bg-zinc-50 focus:bg-white text-sm font-bold transition-all" 
                placeholder="vendedor@loja.com" 
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-zinc-700 mb-1">
                {vendedorEditando ? 'Redefinir Senha' : 'Senha Provisória'}
              </label>
              <input 
                name="senha" 
                type="password" 
                required={!vendedorEditando} // Só é obrigatória se for um funcionário novo!
                className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] outline-none bg-zinc-50 focus:bg-white text-sm font-bold transition-all" 
                placeholder={vendedorEditando ? "Deixe em branco para manter a mesma" : "••••••••"} 
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-zinc-700 mb-1">Nível de Acesso</label>
              <select 
                name="cargo" 
                defaultValue={vendedorEditando?.cargo || 'vendedor'}
                className="w-full p-3 border border-[#E0DDDD] rounded-lg focus:ring-[#6A283A] outline-none bg-zinc-50 focus:bg-white text-sm font-black text-zinc-700 transition-all"
              >
                <option value="vendedor">Vendedor Padrão</option>
                <option value="admin">Administrador Geral</option>
              </select>
            </div>
            
            <button type="submit" className={`w-full mt-4 text-white font-black py-3 md:py-4 px-4 rounded-lg transition-all shadow-md uppercase tracking-wide flex justify-center items-center gap-2 active:scale-95 text-sm md:text-base ${vendedorEditando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#6A283A] hover:bg-[#521e2d]'}`}>
              {vendedorEditando ? 'Guardar Alterações' : 'Liberar Acesso'}
            </button>
          </form>
        </div>

        {/* Tabela Interativa */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#E0DDDD]">
          <h2 className="text-xl font-black text-[#6A283A] mb-6 flex items-center gap-2">
            <span>🔑</span> Usuários Cadastrados
          </h2>
          
          <div className="overflow-x-auto rounded-lg border border-[#E0DDDD]">
            <table className="w-full text-left whitespace-nowrap md:whitespace-normal">
              <thead>
                <tr className="bg-zinc-50 border-b border-[#E0DDDD]">
                  <th className="p-3 text-xs md:text-sm font-black text-zinc-600 uppercase tracking-wider">Nome</th>
                  <th className="p-3 text-xs md:text-sm font-black text-zinc-600 uppercase tracking-wider">E-mail</th>
                  <th className="p-3 text-xs md:text-sm font-black text-zinc-600 uppercase tracking-wider text-center">Acesso</th>
                  <th className="p-3 text-xs md:text-sm font-black text-zinc-600 uppercase tracking-wider text-right">Opções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0DDDD]/50">
                {listaVendedores.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="p-3 font-bold text-zinc-800 text-sm md:text-base">{v.nome}</td>
                    <td className="p-3 text-sm text-zinc-500 font-medium">{v.email}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-md text-[10px] md:text-xs font-black uppercase tracking-wider border ${v.cargo === 'admin' ? 'bg-[#6A283A] text-white border-[#6A283A]' : 'bg-[#EED9D4]/50 text-[#6A283A] border-[#6A283A]/20'}`}>
                        {v.cargo}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botão de Editar */}
                        <Link 
                          href={`/dashboard/vendedores?editId=${v.id}`} 
                          className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-600 hover:text-white transition-colors"
                        >
                          ✏️ Editar
                        </Link>

                        {/* Botão de Excluir */}
                        <form action={excluirVendedor}>
                          <input type="hidden" name="idExcluir" value={v.id} />
                          <button 
                            type="submit" 
                            title="Desvincular e Excluir Usuário"
                            className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-colors"
                          >
                            🗑️ Excluir
                          </button>
                        </form>
                      </div>
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