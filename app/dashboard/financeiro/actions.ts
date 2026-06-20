// app/dashboard/financeiro/actions.ts
'use server'

import { db } from '@/db';
import { vendas, despesas, logsSistema } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUsuarioLogado } from '@/app/actions';

export async function getDadosFinanceiros() {
  const listaVendas = await db.select().from(vendas).where(eq(vendas.status, 'concluida'));
  const listaDespesas = await db.select().from(despesas).orderBy(desc(despesas.data));
  const usuario = await getUsuarioLogado();
  
  return { 
    listaVendas, 
    listaDespesas, 
    isAdmin: usuario?.cargo === 'admin', 
    usuarioNome: usuario?.nome || 'Sistema' 
  };
}

export async function registrarDespesa(formData: FormData) {
  const usu = await getUsuarioLogado();
  if (usu?.cargo !== 'admin') throw new Error("Apenas administradores podem registrar despesas.");

  const descricao = formData.get('descricao') as string;
  const valorTexto = formData.get('valor') as string;
  const data = formData.get('data') as string;
  const categoria = formData.get('categoria') as string;

  // Converte o valor para número
  const valorFormatado = valorTexto.toString().replace(/\./g, '').replace(',', '.');
  const valor = Number(valorFormatado);

  if (!descricao || isNaN(valor) || !data) return;

  await db.insert(despesas).values({
    descricao,
    valor,
    data,
    categoria,
    usuarioNome: usu?.nome || 'Sistema'
  });

  await db.insert(logsSistema).values({
    descricao: `💸 Despesa registrada: "${descricao}" no valor de R$ ${valor.toFixed(2)}.`,
    data: new Date().toISOString(),
    categoria: 'caixa',
    usuarioNome: usu?.nome || 'Sistema'
  });

  revalidatePath('/dashboard/financeiro');
  revalidatePath('/dashboard');
}

export async function excluirDespesa(id: number, descricao: string) {
  const usu = await getUsuarioLogado();
  if (usu?.cargo !== 'admin') throw new Error("Acesso negado.");

  await db.delete(despesas).where(eq(despesas.id, id));

  await db.insert(logsSistema).values({
    descricao: `🗑️ Despesa excluída do sistema: "${descricao}".`,
    data: new Date().toISOString(),
    categoria: 'caixa',
    usuarioNome: usu?.nome || 'Sistema'
  });

  revalidatePath('/dashboard/financeiro');
}