import { NextResponse } from 'next/server';
import { db } from '@/db'; 
import { vendedores } from '@/db/schema';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Criptografa a senha "admin123"
    const hash = await bcrypt.hash('admin123', 10);

    // Salva o usuário no banco Turso
    await db.insert(vendedores).values({
      nome: 'Administrador',
      email: 'admin@loja.com',
      senhaHash: hash,
      cargo: 'admin',
    });

    return NextResponse.json({ message: 'Usuário Administrador criado com sucesso no Turso!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Erro ao criar admin. Talvez ele já exista?' },
      { status: 500 }
    );
  }
}