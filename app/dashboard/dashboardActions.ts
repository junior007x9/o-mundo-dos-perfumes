// app/dashboard/dashboardActions.ts
'use server'

import { db } from '@/db';
import { vendas, produtos, clientes, itensVenda, logsSistema } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUsuarioLogado } from '@/app/actions';

export async function getDadosDashboard() {
  const usuario = await getUsuarioLogado();
  const isAdmin = usuario?.cargo === 'admin';

  const listaVendas = await db.select().from(vendas).orderBy(desc(vendas.id));
  const listaProdutos = await db.select().from(produtos);
  const listaClientes = await db.select().from(clientes);
  const listaItens = await db.select().from(itensVenda);

  // 🚀 SEGURANÇA: Só busca os logs confidenciais se for o administrador
  let logs: any[] = [];
  if (isAdmin) {
    logs = await db.select().from(logsSistema).orderBy(desc(logsSistema.id)).limit(30);
  }

  return { 
    usuario,
    isAdmin,
    listaVendas, 
    listaProdutos, 
    listaClientes, 
    listaItens,
    logs,
    // Mantemos essas duas chaves para garantir compatibilidade com o restante do seu sistema
    idVendedorLogado: usuario?.id || 0,
    cargoVendedor: usuario?.cargo || 'vendedor'
  };
}

export async function cancelarVendaAction(idVenda: number) {
  // 🚀 DESCOBRE QUEM ESTÁ CANCELANDO A VENDA
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  // Encontra os itens da venda
  const itens = await db.select().from(itensVenda).where(eq(itensVenda.idVenda, idVenda));

  // Devolve as quantidades ao estoque
  for (const item of itens) {
    const resProduto = await db.select().from(produtos).where(eq(produtos.id, item.idProduto)).limit(1);
    const produtoAtual = resProduto[0];
    
    if (produtoAtual) {
      await db.update(produtos)
        .set({ estoque: produtoAtual.estoque + item.quantidade })
        .where(eq(produtos.id, item.idProduto));
    }
  }

  // Marca a venda como cancelada
  await db.update(vendas).set({ status: 'cancelada' }).where(eq(vendas.id, idVenda));

  // 🚀 LOG AUTOMÁTICO: Registra o estorno no histórico de auditoria e QUEM fez a ação
  await db.insert(logsSistema).values({
    descricao: `🔄 Venda #${idVenda} estornada com sucesso. Os produtos retornaram ao estoque.`,
    data: new Date().toISOString(),
    categoria: 'venda',
    usuarioNome: nomeUsuario // <--- AQUI ESTÁ A CORREÇÃO MÁGICA
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/caixa');
  revalidatePath('/dashboard/produtos');
}