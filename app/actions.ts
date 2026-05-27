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

  // 1. Busca o usuário no banco de dados
  const usuario = await db.select().from(vendedores).where(eq(vendedores.email, email)).get();

  if (!usuario) {
    console.log("Erro: Usuário não encontrado");
    return;
  }

  // 2. Verifica se a senha está correta
  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);

  if (!senhaValida) {
    console.log("Erro: Senha incorreta");
    return;
  }

  // 3. Cria um cookie de sessão para manter o usuário logado
  const cookieStore = await cookies();
  cookieStore.set('usuario_logado_id', usuario.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 // Duração de 1 dia
  });

  // 4. Redireciona para o Painel de Controle
  redirect('/dashboard');
}

// NOVO: Função para Sair do Sistema com segurança
export async function sairDoSistema() {
  const cookieStore = await cookies();
  cookieStore.delete('usuario_logado_id'); // Destrói o cookie
  redirect('/'); // Manda de volta pra tela de login
}