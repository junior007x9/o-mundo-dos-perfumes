'use client';

import { fazerLogin } from './actions';
import Image from 'next/image';
import { useState, useActionState } from 'react';

export default function LoginPage() {
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Usamos uma função wrapper para lidar com o estado do formulário
  async function actionWrapper(formData: FormData) {
    setCarregando(true);
    setErro(null);
    
    try {
      const resposta = await fazerLogin(formData);
      
      // Se a resposta contiver um erro, exibimos
      if (resposta && typeof resposta === 'object' && 'error' in resposta) {
        setErro(resposta.error as string);
        setCarregando(false);
      }
    } catch (e) {
      setErro("Erro ao conectar com o servidor.");
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E0DDDD]/40">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-2xl border border-[#E0DDDD]">
        
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="relative w-40 h-40 mb-2">
            <Image 
              src="/logo.png" 
              alt="Logo O Mundo dos Perfumes" 
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-black text-[#6A283A] tracking-wider uppercase mt-2">
            O Mundo dos Perfumes
          </h1>
          <p className="text-sm font-semibold text-[#6A283A]/70 mt-1">
            Sistema de Gestão e PDV
          </p>
        </div>

        {erro && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg text-center animate-in fade-in zoom-in duration-300">
            {erro}
          </div>
        )}

        <form action={actionWrapper} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-[#6A283A]">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              required
              className="mt-2 block w-full px-4 py-3 border border-[#E0DDDD] rounded-lg text-zinc-900 focus:ring-[#6A283A] focus:border-[#6A283A] outline-none transition-colors bg-[#E0DDDD]/10"
              placeholder="admin@loja.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6A283A]">
              Senha
            </label>
            <input
              type="password"
              name="senha"
              required
              className="mt-2 block w-full px-4 py-3 border border-[#E0DDDD] rounded-lg text-zinc-900 focus:ring-[#6A283A] focus:border-[#6A283A] outline-none transition-colors bg-[#E0DDDD]/10"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-white bg-[#6A283A] hover:bg-[#521e2d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6A283A] font-bold transition-all text-lg uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {carregando ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}