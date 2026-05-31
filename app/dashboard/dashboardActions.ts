'use server'

import { db } from '@/db';
import { vendas, produtos, clientes, itensVenda } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getDadosDashboard() {
  const listaVendas = await db.select().from(vendas).orderBy(desc(vendas.data));
  const listaProdutos = await db.select().from(produtos);
  const listaClientes = await db.select().from(clientes);

  return {
    listaVendas,
    listaProdutos,
    listaClientes
  };
}

// 🚀 NOVA AÇÃO: Estorno Inteligente
export async function cancelarVendaAction(idVenda: number) {
  // 1. Marca a venda como 'cancelada' (ela não somará mais nos lucros)
  await db.update(vendas).set({ status: 'cancelada' }).where(eq(vendas.id, idVenda));
  
  // 2. Busca os itens que pertenciam a essa venda
  const itens = await db.select().from(itensVenda).where(eq(itensVenda.idVenda, idVenda));
  
  // 3. Devolve exatamente a quantidade comprada para o estoque de cada produto
  for (const item of itens) {
    const produto = await db.select().from(produtos).where(eq(produtos.id, item.idProduto)).get();
    if (produto) {
      await db.update(produtos)
        .set({ estoque: produto.estoque + item.quantidade })
        .where(eq(produtos.id, item.idProduto));
    }
  }

  // 4. Atualiza todas as telas em tempo real
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/caixa');
  revalidatePath('/dashboard/produtos');
}