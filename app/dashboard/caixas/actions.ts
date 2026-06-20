// app/dashboard/caixas/actions.ts
'use server'

import { db } from '@/db';
import { caixas, vendas } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function getDadosHistoricoCaixas() {
  const listaCaixas = await db.select().from(caixas).orderBy(desc(caixas.id));
  const listaVendas = await db.select().from(vendas);
  return { listaCaixas, listaVendas };
}