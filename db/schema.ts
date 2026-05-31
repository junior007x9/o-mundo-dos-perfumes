import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const vendedores = sqliteTable('vendedores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  cargo: text('cargo').notNull().default('vendedor'), 
});

export const produtos = sqliteTable('produtos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  precoCusto: real('preco_custo').notNull(),
  precoVenda: real('preco_venda').notNull(),
  estoque: integer('estoque').notNull().default(0),
  codigoBarras: text('codigo_barras'),
});

export const clientes = sqliteTable('clientes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  telefone: text('telefone'),
  email: text('email'),
  dataNascimento: text('data_nascimento'),
});

export const caixas = sqliteTable('caixas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dataAbertura: text('data_abertura').notNull(),
  dataFechamento: text('data_fechamento'),
  saldoInicial: real('saldo_inicial').notNull().default(0),
  saldoFinal: real('saldo_final'),
  status: text('status').notNull().default('aberto'),
});

/* 🚀 TABELA ATUALIZADA: Agora aceita PIX/Cartão e Status de Cancelamento */
export const vendas = sqliteTable('vendas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  idCaixa: integer('id_caixa').notNull(),
  total: real('total').notNull(),
  data: text('data').notNull(),
  formaPagamento: text('forma_pagamento').default('dinheiro'), 
  status: text('status').notNull().default('concluida'),
});

export const itensVenda = sqliteTable('itens_venda', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  idVenda: integer('id_venda').notNull(),
  idProduto: integer('id_produto').notNull(),
  quantidade: integer('quantidade').notNull(),
  precoUnitario: real('preco_unitario').notNull(),
});

export const fornecedores = sqliteTable('fornecedores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nomeFantasia: text('nome_fantasia').notNull(),
  cnpj: text('cnpj'),
  telefone: text('telefone'),
});