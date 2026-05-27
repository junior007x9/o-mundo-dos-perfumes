import { fazerLogin } from './actions';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E0DDDD]/40">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-2xl border border-[#E0DDDD]">
        
        {/* Área da Logo com as novas cores */}
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

        <form action={fazerLogin} className="space-y-6">
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
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-white bg-[#6A283A] hover:bg-[#521e2d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6A283A] font-bold transition-all text-lg uppercase tracking-wide"
          >
            Acessar Sistema
          </button>
        </form>
      </div>
    </div>
  );
}