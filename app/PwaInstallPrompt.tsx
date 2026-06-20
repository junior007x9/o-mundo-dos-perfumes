// app/PwaInstallPrompt.tsx
'use client';

import { useEffect, useState } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [mostrarAviso, setMostrarAviso] = useState(false);

  useEffect(() => {
    // Registra o Service Worker (Obrigatório para PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('Service Worker Registrado'))
        .catch(err => console.error('Erro no Service Worker:', err));
    }

    // Escuta o evento do navegador que diz "Pode exibir o botão de instalar"
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMostrarAviso(true); // Exibe o nosso aviso visual
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstalar = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('Usuário aceitou a instalação');
      }
      setDeferredPrompt(null);
      setMostrarAviso(false);
    }
  };

  if (!mostrarAviso) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white p-5 rounded-2xl shadow-2xl border border-amber-200 z-[9999] flex flex-col items-center text-center animate-in slide-in-from-bottom-10">
      <div className="w-16 h-16 bg-[#6A283A] rounded-full mb-3 flex items-center justify-center text-3xl shadow-md border-4 border-amber-100">
        📲
      </div>
      <h3 className="font-black text-[#6A283A] text-lg mb-1 uppercase tracking-wide">Instalar Sistema</h3>
      <p className="text-sm text-zinc-500 mb-5 font-medium leading-relaxed">
        Instale o PDV no seu celular ou computador para acesso rápido como um aplicativo nativo.
      </p>
      <div className="flex gap-2 w-full">
        <button onClick={() => setMostrarAviso(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors font-bold rounded-xl text-sm">
          Agora Não
        </button>
        <button onClick={handleInstalar} className="flex-[2] py-3 bg-[#6A283A] text-white hover:bg-[#521e2d] transition-colors font-black rounded-xl text-sm shadow-md uppercase tracking-wider">
          Baixar App
        </button>
      </div>
    </div>
  );
}