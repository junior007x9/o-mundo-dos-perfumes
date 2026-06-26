// app/dashboard/produtos/BotaoCamera.tsx
'use client';

import { useState, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function BotaoCamera() {
  const [cameraAberta, setCameraAberta] = useState(false);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (cameraAberta) {
      // 🚀 TIMEOUT ESSENCIAL: Aguarda os elementos montarem no smartphone antes de acionar a lente
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("leitor-camera-produtos");
          const config = {
            fps: 20,
            qrbox: { width: 280, height: 150 }, // Formato retangular nativo para códigos EAN/CODE128 de perfumes
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE
            ]
          };

          html5QrCode.start(
            { facingMode: "environment" },
            config,
            (codigoLido) => {
              // Procura o input de código de barras na tela e preenche
              const input = document.getElementById('codigoBarras') as HTMLInputElement;
              if (input) {
                input.value = codigoLido;
                // Dispara o evento nativo para avisar ao Next/React que o valor mudou
                const evento = new Event('input', { bubbles: true });
                input.dispatchEvent(evento);
              }
              
              if (html5QrCode) {
                html5QrCode.stop().then(() => setCameraAberta(false)).catch(err => console.error(err));
              }
            },
            () => {}
          ).catch((err) => {
            console.error("Erro na câmara de registo:", err);
            alert("Não foi possível aceder à câmara de registo.");
            setCameraAberta(false);
          });
        } catch (e) {
          console.error("Aguardando elemento pronto", e);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(() => {});
        }
      };
    }
  }, [cameraAberta]);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setCameraAberta(true)}
        className="w-full bg-zinc-800 text-white text-xs font-black py-2.5 rounded-lg uppercase tracking-wider hover:bg-zinc-700 transition-colors shadow-sm"
      >
        📷 Usar Câmara para Scanear
      </button>

      {cameraAberta && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <h2 className="text-xl font-black text-white uppercase tracking-widest">Enquadre o Código de Barras</h2>
            <div id="leitor-camera-produtos" className="w-full aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-white/20"></div>
            <button
              type="button"
              onClick={() => setCameraAberta(false)}
              className="w-full bg-white/10 text-white font-bold py-4 rounded-xl uppercase text-sm"
            >
              ✖ Fechar Scanner
            </button>
          </div>
        </div>
      )}
    </div>
  );
}