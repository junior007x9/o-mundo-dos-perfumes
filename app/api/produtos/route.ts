import { db } from '@/db';
import { produtos } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const dados = await req.json();
  await db.insert(produtos).values(dados);
  return NextResponse.json({ sucesso: true });
}