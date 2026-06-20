// app/actions.ts
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

  if (!email || !senha) {
    return { error: "Por favor, preencha e-mail e senha." };
  }

  // 🚀 CORREÇÃO: Usar .limit(1) e pegar [0] é seguro para SQLite, Postgres e MySQL
  const resultados = await db.select().from(vendedores).where(eq(vendedores.email, email)).limit(1);
  const usuario = resultados[0];

  if (!usuario) {
    console.log("Erro: Usuário não encontrado");
    return { error: "E-mail ou senha incorretos." };
  }

  const senhaValida = await bcrypt.compare(senha, String(usuario.senhaHash));

  if (!senhaValida) {
    console.log("Erro: Senha incorreta");
    return { error: "E-mail ou senha incorretos." };
  }

  const cookieStore = await cookies();
  
  // Salva o ID
  cookieStore.set('usuario_logado_id', usuario.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 // 1 dia
  });
  
  // Salva o Cargo no cookie para o Middleware conseguir ler e bloquear telas
  cookieStore.set('usuario_logado_cargo', String(usuario.cargo), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24
  });

  // Se for vendedor, manda direto para o Caixa para facilitar o trabalho dele
  if (usuario.cargo === 'vendedor') {
    redirect('/dashboard/caixa');
  }

  // Se for administrador, vai para a visão geral
  redirect('/dashboard');
}

export async function sairDoSistema() {
  const cookieStore = await cookies();
  cookieStore.delete('usuario_logado_id');
  cookieStore.delete('usuario_logado_cargo'); // Limpa o cargo ao sair
  redirect('/');
}

// Busca os dados e o cargo do usuário logado
export async function getUsuarioLogado() {
  const cookieStore = await cookies();
  const idStr = cookieStore.get('usuario_logado_id')?.value;
  
  if (!idStr) return null;
  
  const id = Number(idStr);
  
  // 🚀 CORREÇÃO: Mesma proteção de compatibilidade usada no login
  const resultados = await db.select().from(vendedores).where(eq(vendedores.id, id)).limit(1);
  const usuario = resultados[0];
  
  if (!usuario) return null;
  
  return {
    id: usuario.id, // 🚀 NOVO: Necessário para registrar vendas no caixa!
    nome: usuario.nome,
    cargo: usuario.cargo // 'admin' ou 'vendedor'
  };
}