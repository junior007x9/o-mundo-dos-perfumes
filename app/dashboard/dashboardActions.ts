'use server'

import { db } from '@/db';
import { vendas, produtos, clientes } from '@/db/schema';
import { desc } from 'drizzle-orm';

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