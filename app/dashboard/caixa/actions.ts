'use server'

import { db } from '@/db';
import { caixas, vendas, itensVenda, produtos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Busca se existe algum caixa aberto hoje
export async function getCaixaAberto() {
  return await db.select().from(caixas).where(eq(caixas.status, 'aberto')).get();
}

// Busca todos os produtos para a tela de vendas
export async function getProdutosPDV() {
  return await db.select().from(produtos);
}

// Abre o caixa com um troco/saldo inicial
export async function abrirCaixa(formData: FormData) {
  const saldoInicial = Number(formData.get('saldoInicial'));
  await db.insert(caixas).values({
    dataAbertura: new Date().toISOString(),
    saldoInicial: saldoInicial,
    status: 'aberto'
  });
  revalidatePath('/dashboard/caixa');
}

// Fecha o caixa no fim do dia
export async function fecharCaixa(idCaixa: number, saldoFinal: number) {
  await db.update(caixas)
    .set({ status: 'fechado', dataFechamento: new Date().toISOString(), saldoFinal })
    .where(eq(caixas.id, idCaixa));
  revalidatePath('/dashboard/caixa');
}

// Finaliza a compra do cliente, salva o recibo e baixa o estoque
export async function finalizarVenda(idCaixa: number, carrinho: any[], total: number) {
  // 1. Salva a Venda
  const novaVenda = await db.insert(vendas).values({
    idCaixa,
    total,
    data: new Date().toISOString()
  }).returning({ id: vendas.id });

  const idVenda = novaVenda[0].id;

  // 2. Salva os itens e desconta do estoque
  for (const item of carrinho) {
    await db.insert(itensVenda).values({
      idVenda,
      idProduto: item.id,
      quantidade: item.quantidade,
      precoUnitario: item.precoVenda
    });

    // Busca o produto para abater o estoque
    const prod = await db.select().from(produtos).where(eq(produtos.id, item.id)).get();
    if (prod) {
      await db.update(produtos)
        .set({ estoque: prod.estoque - item.quantidade })
        .where(eq(produtos.id, item.id));
    }
  }

  revalidatePath('/dashboard/caixa');
  revalidatePath('/dashboard/produtos');
}