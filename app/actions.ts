'use server'

import { db } from '@/db';
import { vendedores } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function fazerLogin(formData: FormData) {
  const email = formData.get('email') as string;
  const senha = formData.get('senha') as string;

  if (!email || !senha) return;

  const usuario = await db.select().from(vendedores).where(eq(vendedores.email, email)).get();

  if (!usuario) {
    console.log("Erro: Usuário não encontrado");
    return;
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);

  if (!senhaValida) {
    console.log("Erro: Senha incorreta");
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set('usuario_logado_id', usuario.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24
  });

  // Se for vendedor, manda direto para o Caixa para facilitar o trabalho dele
  if (usuario.cargo === 'vendedor') {
    redirect('/dashboard/caixa');
  }

  redirect('/dashboard');
}

export async function sairDoSistema() {
  const cookieStore = await cookies();
  cookieStore.delete('usuario_logado_id');
  redirect('/');
}

// 🚀 NOVA FUNÇÃO: Busca os dados e o cargo do usuário logado
export async function getUsuarioLogado() {
  const cookieStore = await cookies();
  const idStr = cookieStore.get('usuario_logado_id')?.value;
  
  if (!idStr) return null;
  
  const id = Number(idStr);
  const usuario = await db.select().from(vendedores).where(eq(vendedores.id, id)).get();
  
  if (!usuario) return null;
  
  return {
    nome: usuario.nome,
    cargo: usuario.cargo // 'admin' ou 'vendedor'
  };
}