// app/dashboard/clientes/actions.ts
'use server'

import { db } from '@/db';
import { clientes, vendas, logsSistema } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUsuarioLogado } from '@/app/actions';

export async function getDadosCRM() {
  const listaClientes = await db.select().from(clientes).orderBy(desc(clientes.id));
  const listaVendas = await db.select().from(vendas).where(eq(vendas.status, 'concluida'));
  const usuario = await getUsuarioLogado();
  
  return { 
    listaClientes, 
    listaVendas, 
    isAdmin: usuario?.cargo === 'admin', 
    usuarioNome: usuario?.nome || 'Sistema' 
  };
}

export async function salvarClienteCRM(id: number | null, nome: string, telefone: string, dataNasc: string) {
  const usu = await getUsuarioLogado();
  if (id) {
    await db.update(clientes).set({ nome, telefone, dataNascimento: dataNasc }).where(eq(clientes.id, id));
    await db.insert(logsSistema).values({ 
      descricao: `👤 Cliente atualizado no CRM: ${nome}`, 
      data: new Date().toISOString(), 
      categoria: 'venda', 
      usuarioNome: usu?.nome || 'Sistema' 
    });
  } else {
    await db.insert(clientes).values({ nome, telefone, dataNascimento: dataNasc, email: '' });
    await db.insert(logsSistema).values({ 
      descricao: `👤 Novo cliente adicionado pelo CRM: ${nome}`, 
      data: new Date().toISOString(), 
      categoria: 'venda', 
      usuarioNome: usu?.nome || 'Sistema' 
    });
  }
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/caixa');
}

export async function excluirClienteCRM(id: number) {
  const usu = await getUsuarioLogado();
  if (usu?.cargo !== 'admin') throw new Error("Sem permissão");
  
  await db.delete(clientes).where(eq(clientes.id, id));
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/caixa');
}