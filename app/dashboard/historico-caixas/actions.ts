// app/dashboard/historico-caixas/actions.ts
'use server'

import { db } from '@/db';
import { caixas, vendas, itensVenda, produtos, logsSistema } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUsuarioLogado } from '@/app/actions';

export async function getHistoricoCaixas() {
  const listaCaixas = await db.select().from(caixas).orderBy(desc(caixas.dataAbertura));
  const listaVendas = await db.select().from(vendas).orderBy(desc(vendas.data));

  return {
    listaCaixas,
    listaVendas
  };
}

// 🚀 NOVA FUNÇÃO: Exclui uma venda e DEVOLVE o produto para o estoque
export async function excluirVenda(idVenda: number) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  // 1. Busca quais produtos estavam nessa venda
  const itens = await db.select().from(itensVenda).where(eq(itensVenda.idVenda, idVenda));

  // 2. Devolve o estoque de cada produto
  for (const item of itens) {
    const prod = await db.select().from(produtos).where(eq(produtos.id, item.idProduto)).limit(1);
    if (prod.length > 0) {
      await db.update(produtos)
        .set({ estoque: prod[0].estoque + item.quantidade })
        .where(eq(produtos.id, item.idProduto));
    }
  }

  // 3. Apaga a venda do banco (os itensVenda somem automaticamente)
  await db.delete(vendas).where(eq(vendas.id, idVenda));

  // 4. Grava no log de sistema para auditoria
  await db.insert(logsSistema).values({
    descricao: `🗑️ Venda #${idVenda} estornada/excluída. Produtos devolvidos ao estoque.`,
    data: new Date().toISOString(),
    categoria: 'venda',
    usuarioNome: nomeUsuario
  });

  revalidatePath('/dashboard/historico-caixas');
  revalidatePath('/dashboard/produtos');
  revalidatePath('/dashboard');
}

// 🚀 NOVA FUNÇÃO: Exclui o Caixa inteiro (ótimo para limpar os seus dias de teste)
export async function excluirCaixaInteiro(idCaixa: number) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  // 1. Pega todas as vendas desse caixa
  const vendasDoCaixa = await db.select().from(vendas).where(eq(vendas.idCaixa, idCaixa));

  // 2. Para cada venda, devolve o estoque dos itens
  for (const v of vendasDoCaixa) {
    const itens = await db.select().from(itensVenda).where(eq(itensVenda.idVenda, v.id));
    for (const item of itens) {
      const prod = await db.select().from(produtos).where(eq(produtos.id, item.idProduto)).limit(1);
      if (prod.length > 0) {
        await db.update(produtos)
          .set({ estoque: prod[0].estoque + item.quantidade })
          .where(eq(produtos.id, item.idProduto));
      }
    }
    // 3. Apaga a venda após devolver o estoque
    await db.delete(vendas).where(eq(vendas.id, v.id));
  }

  // 4. Finalmente, apaga o caixa
  await db.delete(caixas).where(eq(caixas.id, idCaixa));

  // 5. Salva no log
  await db.insert(logsSistema).values({
    descricao: `🚨 Caixa #${idCaixa} apagado. Todas as vendas canceladas e estoques restaurados.`,
    data: new Date().toISOString(),
    categoria: 'caixa',
    usuarioNome: nomeUsuario
  });

  revalidatePath('/dashboard/historico-caixas');
  revalidatePath('/dashboard/produtos');
  revalidatePath('/dashboard');
}