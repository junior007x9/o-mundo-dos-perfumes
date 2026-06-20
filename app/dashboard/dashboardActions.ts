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
    idVendedorLogado: usuario?.id || 0,
    cargoVendedor: usuario?.cargo || 'vendedor'
  };
}

export async function cancelarVendaAction(idVenda: number) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const itens = await db.select().from(itensVenda).where(eq(itensVenda.idVenda, idVenda));

  for (const item of itens) {
    const resProduto = await db.select().from(produtos).where(eq(produtos.id, item.idProduto)).limit(1);
    const produtoAtual = resProduto[0];
    
    if (produtoAtual) {
      await db.update(produtos)
        .set({ estoque: produtoAtual.estoque + item.quantidade })
        .where(eq(produtos.id, item.idProduto));
    }
  }

  await db.update(vendas).set({ status: 'cancelada' }).where(eq(vendas.id, idVenda));

  await db.insert(logsSistema).values({
    descricao: `🔄 Venda #${idVenda} estornada com sucesso. Os produtos retornaram ao estoque.`,
    data: new Date().toISOString(),
    categoria: 'venda',
    usuarioNome: nomeUsuario 
  });

  revalidatePath('/dashboard');
}

// 🚀 PASSO 1: FUNÇÃO PARA QUITAR TOTALMENTE A DÍVIDA (BLINDADA)
export async function quitarVendaAction(idVenda: number) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const resVenda = await db.select().from(vendas).where(eq(vendas.id, idVenda)).limit(1);
  const vendaAtual = resVenda[0];

  if (vendaAtual) {
    // 🚀 Garante que a forma de pagamento é uma string para evitar o erro de 'null'
    const formaSegura = String(vendaAtual.formaPagamento || '');
    const novaFormaPagamento = `${formaSegura};pago=true`;
    
    await db.update(vendas).set({ formaPagamento: novaFormaPagamento }).where(eq(vendas.id, idVenda));

    await db.insert(logsSistema).values({
      descricao: `✅ Conta vinculada à Venda #${idVenda} foi totalmente quitada e baixada.`,
      data: new Date().toISOString(),
      categoria: 'venda',
      usuarioNome: nomeUsuario
    });
  }

  revalidatePath('/dashboard');
}

// 🚀 PASSO 1: FUNÇÃO PARA ATUALIZAR A NOTA DE CONFERÊNCIA (BLINDADA)
export async function atualizarNotaReceberAction(idVenda: number, novaNota: string) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const resVenda = await db.select().from(vendas).where(eq(vendas.id, idVenda)).limit(1);
  const vendaAtual = resVenda[0];

  if (vendaAtual) {
    // 🚀 Converte estritamente para string para que o split não trave
    const formaSegura = String(vendaAtual.formaPagamento || '');
    
    // Remove qualquer anotação antiga para evitar duplicação e anexa a nova
    const formaLimpa = formaSegura.split(';obs=')[0].split(':obs=')[0];
    const prefixo = formaSegura.startsWith('venda_direta') ? 'venda_direta:obs=' : `${formaLimpa};obs=`;
    const novaForma = `${prefixo}${novaNota.replace(/[:;=]/g, ' ')}`;

    await db.update(vendas).set({ formaPagamento: novaForma }).where(eq(vendas.id, idVenda));

    await db.insert(logsSistema).values({
      descricao: `📝 Histórico de parcelas da Venda #${idVenda} modificado para: "${novaNota}".`,
      data: new Date().toISOString(),
      categoria: 'venda',
      usuarioNome: nomeUsuario
    });
  }

  revalidatePath('/dashboard');
}