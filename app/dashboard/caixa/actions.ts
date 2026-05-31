'use server'

import { db } from '@/db';
import { caixas, produtos, vendas, itensVenda } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getCaixaAberto() {
  return await db.select().from(caixas).where(eq(caixas.status, 'aberto')).orderBy(desc(caixas.id)).get();
}

export async function getProdutosPDV() {
  return await db.select().from(produtos).orderBy(desc(produtos.id));
}

export async function abrirCaixa(formData: FormData) {
  const saldoInicial = Number(formData.get('saldoInicial'));
  await db.insert(caixas).values({
    dataAbertura: new Date().toISOString(),
    saldoInicial,
    status: 'aberto'
  });
  revalidatePath('/dashboard/caixa');
}

export async function fecharCaixa(id: number, saldoFinal: number) {
  await db.update(caixas).set({
    dataFechamento: new Date().toISOString(),
    saldoFinal,
    status: 'fechado'
  }).where(eq(caixas.id, id));
  revalidatePath('/dashboard/caixa');
}

// 🚀 ATUALIZADO: Agora recebe a forma de pagamento e marca o status como concluída
export async function finalizarVenda(idCaixa: number, carrinho: any[], total: number, formaPagamento: string = 'dinheiro') {
  const result = await db.insert(vendas).values({
    idCaixa,
    total,
    data: new Date().toISOString(),
    formaPagamento,
    status: 'concluida'
  }).returning({ insertedId: vendas.id });

  const idVenda = result[0].insertedId;

  for (const item of carrinho) {
    await db.insert(itensVenda).values({
      idVenda,
      idProduto: item.id,
      quantidade: item.quantidade,
      precoUnitario: item.precoVenda
    });

    const produtoAtual = await db.select().from(produtos).where(eq(produtos.id, item.id)).get();
    if (produtoAtual) {
      await db.update(produtos)
        .set({ estoque: produtoAtual.estoque - item.quantidade })
        .where(eq(produtos.id, item.id));
    }
  }
  
  revalidatePath('/dashboard/caixa');
  revalidatePath('/dashboard/produtos');
  revalidatePath('/dashboard');
}