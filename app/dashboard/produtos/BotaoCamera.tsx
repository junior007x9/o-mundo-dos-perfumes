'use client';

import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BotaoCamera() {
  const [cameraAberta, setCameraAberta] = useState(false);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (cameraAberta) {
      html5QrCode = new Html5Qrcode("leitor-camera-cadastro");

      const config = { fps: 15, aspectRatio: 0.75 };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (codigoLido) => {
          if (html5QrCode) {
            html5QrCode.stop().then(() => {
              setCameraAberta(false);
              // 🚀 A MÁGICA AQUI: Joga o código lido direto no input do formulário!
              const inputCodigo = document.getElementById('codigoBarras') as HTMLInputElement;
              if (inputCodigo) {
                inputCodigo.value = codigoLido;
                // Efeito visual verdinho rápido para mostrar que leu com sucesso
                inputCodigo.style.transition = 'all 0.3s';
                inputCodigo.style.boxShadow = '0 0 0 4px rgba(34, 197, 94, 0.3)';
                inputCodigo.style.borderColor = '#22c55e';
                setTimeout(() => {
                  inputCodigo.style.boxShadow = '';
                  inputCodigo.style.borderColor = '';
                }, 1500);
              }
            }).catch(err => console.error("Erro ao parar a câmera", err));
          }
        },
        () => {}
      ).catch((err) => {
        console.error("Erro ao iniciar câmera", err);
        alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
        setCameraAberta(false);
      });
    }
    
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [cameraAberta]);

  return (
    <>
      <button 
        type="button" // IMPORTANTE para não enviar o formulário sem querer
        onClick={() => setCameraAberta(true)}
        className="w-full mt-2 bg-zinc-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-black transition-colors flex justify-center items-center gap-2 shadow-md uppercase tracking-wide text-sm"
      >
        📷 Usar Câmera do Celular
      </button>

      {/* MODAL DA CÂMERA (DESIGN MODERNO) */}
      {cameraAberta && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scanLine { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
            .animate-laser { position: absolute; width: 100%; height: 3px; background: rgba(255, 59, 48, 0.9); box-shadow: 0 0 15px #ff3b30, 0 0 30px #ff3b30; animation: scanLine 2s linear infinite; z-index: 20; }
            #leitor-camera-cadastro { border: none !important; background: #000; }
            #leitor-camera-cadastro video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
            #leitor-camera-cadastro > div { display: none !important; } 
          `}} />

          <div className="w-full max-w-sm flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-1 flex items-center justify-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                Lendo Código
              </h2>
              <p className="text-zinc-400 text-sm font-medium">Aponte a câmera para cadastrar.</p>
            </div>

            <div className="relative w-full aspect-[3/4] bg-zinc-900 rounded-3xl border-4 border-white/10 overflow-hidden shadow-[0_0_40px_rgba(106,40,58,0.3)]">
              <div id="leitor-camera-cadastro" className="w-full h-full absolute inset-0"></div>
              <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none"></div>
              <div className="absolute inset-0 m-[40px] pointer-events-none flex flex-col justify-between">
                <div className="flex justify-between w-full h-8">
                  <div className="w-8 h-full border-t-4 border-l-4 border-white rounded-tl-xl"></div>
                  <div className="w-8 h-full border-t-4 border-r-4 border-white rounded-tr-xl"></div>
                </div>
                <div className="relative h-full w-full overflow-hidden">
                  <div className="animate-laser"></div>
                </div>
                <div className="flex justify-between w-full h-8">
                  <div className="w-8 h-full border-b-4 border-l-4 border-white rounded-bl-xl"></div>
                  <div className="w-8 h-full border-b-4 border-r-4 border-white rounded-br-xl"></div>
                </div>
              </div>
            </div>

            <button type="button" onClick={() => setCameraAberta(false)} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl border border-white/20 transition-all uppercase tracking-wider">
              ✖ Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}