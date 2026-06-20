// db/schema.ts
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

export const vendas = sqliteTable('vendas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  idCaixa: integer('id_caixa').notNull().references(() => caixas.id),
  idCliente: integer('id_cliente').references(() => clientes.id),
  idVendedor: integer('id_vendedor').references(() => vendedores.id), 
  total: real('total').notNull(),
  data: text('data').notNull(),
  formaPagamento: text('forma_pagamento').default('dinheiro'), 
  status: text('status').notNull().default('concluida'),
});

export const itensVenda = sqliteTable('itens_venda', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  idVenda: integer('id_venda').notNull().references(() => vendas.id, { onDelete: 'cascade' }),
  idProduto: integer('id_produto').notNull().references(() => produtos.id),
  quantidade: integer('quantidade').notNull(),
  precoUnitario: real('preco_unitario').notNull(),
});

export const fornecedores = sqliteTable('fornecedores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nomeFantasia: text('nome_fantasia').notNull(),
  cnpj: text('cnpj'),
  telefone: text('telefone'),
});

/* Controle de Despesas e Contas a Pagar */
export const despesas = sqliteTable('despesas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  descricao: text('descricao').notNull(),
  valor: real('valor').notNull(),
  data: text('data').notNull(),
  categoria: text('categoria').notNull().default('outros'), // Ex: aluguel, salario, luz, estoque
  usuarioNome: text('usuario_nome').default('Sistema'), // 🚀 ATUALIZADO: Identifica o autor do lançamento
});

export const logsSistema = sqliteTable('logs_sistema', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  descricao: text('descricao').notNull(),
  data: text('data').notNull(),
  categoria: text('categoria').notNull().default('info'), 
  usuarioNome: text('usuario_nome').default('Sistema'), 
});