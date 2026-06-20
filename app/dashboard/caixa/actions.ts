// app/dashboard/caixa/actions.ts
'use server'

import { db } from '@/db';
import { caixas, produtos, vendas, itensVenda, clientes, logsSistema } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUsuarioLogado } from '@/app/actions';

export async function getCaixaAberto() {
  const resultados = await db.select().from(caixas).where(eq(caixas.status, 'aberto')).orderBy(desc(caixas.id)).limit(1);
  return resultados[0] || null;
}

export async function getVendasDoCaixa(idCaixa: number) {
  return await db.select().from(vendas).where(eq(vendas.idCaixa, idCaixa));
}

export async function getProdutosPDV() {
  return await db.select().from(produtos).orderBy(desc(produtos.id));
}

export async function getClientesPDV() {
  return await db.select().from(clientes).orderBy(desc(clientes.nome));
}

// 🚀 NOVA FUNÇÃO: Cadastra o cliente diretamente pelo PDV e devolve o ID dele
export async function cadastrarClientePDV(nome: string, telefone: string, dataNascimento: string) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const result = await db.insert(clientes).values({
    nome,
    telefone,
    dataNascimento,
    email: '' // O email não é obrigatório no PDV
  }).returning({ insertedId: clientes.id });
  
  await db.insert(logsSistema).values({
    descricao: `👤 Novo cliente cadastrado no PDV rápido: "${nome}".`,
    data: new Date().toISOString(),
    categoria: 'caixa',
    usuarioNome: nomeUsuario 
  });

  revalidatePath('/dashboard/caixa');
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard');
  
  return result[0].insertedId;
}

export async function abrirCaixa(formData: FormData) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const saldoInicial = Number(formData.get('saldoInicial'));
  await db.insert(caixas).values({
    dataAbertura: new Date().toISOString(),
    saldoInicial,
    status: 'aberto'
  });
  
  await db.insert(logsSistema).values({
    descricao: `💵 Caixa aberto no PDV com saldo inicial de troco de ${saldoInicial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    data: new Date().toISOString(),
    categoria: 'caixa',
    usuarioNome: nomeUsuario 
  });

  revalidatePath('/dashboard/caixa');
  revalidatePath('/dashboard');
}

export async function fecharCaixa(id: number, saldoFinal: number) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  await db.update(caixas).set({
    dataFechamento: new Date().toISOString(),
    saldoFinal,
    status: 'fechado'
  }).where(eq(caixas.id, id));

  await db.insert(logsSistema).values({
    descricao: `🔒 Caixa encerrado. Saldo total final contabilizado: ${saldoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    data: new Date().toISOString(),
    categoria: 'caixa',
    usuarioNome: nomeUsuario 
  });

  revalidatePath('/dashboard/caixa');
  revalidatePath('/dashboard');
}

export async function finalizarVenda(
  idCaixa: number, 
  carrinho: any[], 
  total: number, 
  formaPagamento: string = 'dinheiro',
  idCliente?: number,
  idVendedor?: number 
) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const result = await db.insert(vendas).values({
    idCaixa,
    idCliente,
    idVendedor, 
    total,
    data: new Date().toISOString(),
    formaPagamento,
    status: 'concluida'
  }).returning({ insertedId: vendas.id });

  const idVenda = result[0].insertedId;
  const itensNomes: string[] = [];

  for (const item of carrinho) {
    await db.insert(itensVenda).values({
      idVenda,
      idProduto: item.id,
      quantidade: item.quantidade,
      precoUnitario: item.precoVenda
    });

    const resProduto = await db.select().from(produtos).where(eq(produtos.id, item.id)).limit(1);
    const produtoAtual = resProduto[0];
    
    if (produtoAtual) {
      itensNomes.push(`${item.quantidade}x ${produtoAtual.nome}`);
      await db.update(produtos)
        .set({ estoque: produtoAtual.estoque - item.quantidade })
        .where(eq(produtos.id, item.id));
    }
  }
  
  await db.insert(logsSistema).values({
    descricao: `🛒 Venda finalizada: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no ${formaPagamento.toUpperCase()}. Itens: ${itensNomes.join(', ')}.`,
    data: new Date().toISOString(),
    categoria: 'venda',
    usuarioNome: nomeUsuario 
  });
  
  revalidatePath('/dashboard/caixa');
  revalidatePath('/dashboard/produtos');
  revalidatePath('/dashboard');
}