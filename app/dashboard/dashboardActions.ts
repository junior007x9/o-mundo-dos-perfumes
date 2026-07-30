// app/dashboard/dashboardActions.ts
'use server'

import { db } from '@/db';
import { vendas, produtos, clientes, itensVenda, logsSistema, vendedores } from '@/db/schema';
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

  let listaUsuarios: any[] = [];
  try {
    listaUsuarios = await db.select().from(vendedores);
  } catch (e) {
    console.error("Erro ao carregar a lista de utilizadores:", e);
  }

  let logs: any[] = [];
  if (isAdmin) {
    logs = await db.select().from(logsSistema).orderBy(desc(logsSistema.id)).limit(500);
  }

  return { 
    usuario,
    isAdmin,
    listaVendas, 
    listaProdutos, 
    listaClientes, 
    listaItens,
    listaUsuarios, 
    logs,
    idVendedorLogado: usuario?.id || 0,
    cargoVendedor: usuario?.cargo || 'vendedor'
  };
}

export async function cancelarVendaAction(idVenda: number) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const itens = await db.select().from(itensVenda).where(eq(itensVenda.idVenda, idVenda));
  let logsDetalhesEstorno: string[] = [];

  for (const item of itens) {
    const resProduto = await db.select().from(produtos).where(eq(produtos.id, item.idProduto)).limit(1);
    const produtoAtual = resProduto[0];
    
    if (produtoAtual) {
      const estoqueAntigo = produtoAtual.estoque;
      const quantidadeDevolvida = item.quantidade;
      const novoEstoque = estoqueAntigo + quantidadeDevolvida;

      await db.update(produtos).set({ estoque: novoEstoque }).where(eq(produtos.id, item.idProduto));
      logsDetalhesEstorno.push(`[${produtoAtual.nome}: Tinha ${estoqueAntigo} ➡️ Voltou +${quantidadeDevolvida} ➡️ Agora ${novoEstoque}]`);
    }
  }

  await db.update(vendas).set({ status: 'cancelada' }).where(eq(vendas.id, idVenda));

  const detalheLog = logsDetalhesEstorno.length > 0 ? logsDetalhesEstorno.join(' | ') : 'Nenhum produto rastreável';
  await db.insert(logsSistema).values({
    descricao: `🔄 Venda #${idVenda} estornada com sucesso. Estoque restaurado: ${detalheLog}`,
    data: new Date().toISOString(),
    categoria: 'venda',
    usuarioNome: nomeUsuario 
  });
  revalidatePath('/dashboard');
}

export async function quitarVendaAction(idVenda: number) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const resVenda = await db.select().from(vendas).where(eq(vendas.id, idVenda)).limit(1);
  const vendaAtual = resVenda[0];

  if (vendaAtual) {
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

// 🚀 FUNÇÃO PARA DAR BAIXA EM APENAS UMA PARCELA
export async function pagarParcelaAction(idVenda: number) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const resVenda = await db.select().from(vendas).where(eq(vendas.id, idVenda)).limit(1);
  if (!resVenda.length) return;
  
  let forma = String(resVenda[0].formaPagamento);
  const matchP = forma.match(/parcelas=(\d+)/);
  const matchPg = forma.match(/pagas=(\d+)/);

  if (matchP && matchPg) {
    const parcelasTotal = Number(matchP[1]);
    const parcelasPagas = Number(matchPg[1]) + 1; // Avança uma parcela

    forma = forma.replace(`pagas=${matchPg[1]}`, `pagas=${parcelasPagas}`);

    if (parcelasPagas >= parcelasTotal) {
      forma += ';pago=true'; // Se pagou a última, quita tudo
    }

    await db.update(vendas).set({ formaPagamento: forma }).where(eq(vendas.id, idVenda));

    await db.insert(logsSistema).values({
      descricao: `💰 Parcela ${parcelasPagas}/${parcelasTotal} da Venda #${idVenda} foi recebida e baixada.`,
      data: new Date().toISOString(),
      categoria: 'venda',
      usuarioNome: nomeUsuario
    });
  }
  revalidatePath('/dashboard');
}

// 🚀 FUNÇÃO PARA TRANSFORMAR VENDAS ANTIGAS EM PARCELADAS
export async function atualizarVendaParaParceladaAction(idVenda: number, parcelas: number, dataBase: string, obs: string) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const resVenda = await db.select().from(vendas).where(eq(vendas.id, idVenda)).limit(1);
  if (resVenda[0]) {
    const novaForma = `venda_direta:parcelas=${parcelas}:pagas=0:data=${dataBase}:obs=${obs.replace(/[:;=]/g, ' ')}`;
    await db.update(vendas).set({ formaPagamento: novaForma }).where(eq(vendas.id, idVenda));

    await db.insert(logsSistema).values({
      descricao: `🔄 Venda #${idVenda} convertida para carnê parcelado em ${parcelas}x.`,
      data: new Date().toISOString(),
      categoria: 'venda',
      usuarioNome: nomeUsuario
    });
  }
  revalidatePath('/dashboard');
}

export async function atualizarNotaReceberAction(idVenda: number, novaNota: string) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  const resVenda = await db.select().from(vendas).where(eq(vendas.id, idVenda)).limit(1);
  const vendaAtual = resVenda[0];

  if (vendaAtual) {
    const formaSegura = String(vendaAtual.formaPagamento || '');
    if (formaSegura.includes(':parcelas=')) {
       const parteSemObs = formaSegura.split(':obs=')[0];
       const novaForma = `${parteSemObs}:obs=${novaNota.replace(/[:;=]/g, ' ')}`;
       await db.update(vendas).set({ formaPagamento: novaForma }).where(eq(vendas.id, idVenda));
    } else {
       const formaLimpa = formaSegura.split(';obs=')[0].split(':obs=')[0];
       const prefixo = formaSegura.startsWith('venda_direta') ? 'venda_direta:obs=' : `${formaLimpa};obs=`;
       const novaForma = `${prefixo}${novaNota.replace(/[:;=]/g, ' ')}`;
       await db.update(vendas).set({ formaPagamento: novaForma }).where(eq(vendas.id, idVenda));
    }
    await db.insert(logsSistema).values({
      descricao: `📝 Histórico de anotações da Venda #${idVenda} modificado.`,
      data: new Date().toISOString(),
      categoria: 'venda',
      usuarioNome: nomeUsuario
    });
  }
  revalidatePath('/dashboard');
}

export async function atualizarVendedorAction(idVenda: number, novoVendedor: string) {
  const usu = await getUsuarioLogado();
  const nomeUsuario = usu?.nome || 'Sistema';

  await db.insert(logsSistema).values({
    descricao: `[CORRECAO_VENDEDOR] Cupom #${idVenda} => ${novoVendedor}`,
    data: new Date().toISOString(),
    categoria: 'venda',
    usuarioNome: nomeUsuario
  });
  revalidatePath('/dashboard');
}