import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaInstallPrompt from "./PwaInstallPrompt"; // 🚀 Importa o novo aviso de instalação

// 🚀 Metadados para o aplicativo (PWA)
export const metadata: Metadata = {
  title: "O Mundo dos Perfumes",
  description: "Sistema de Gestão e PDV",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "O Mundo dos Perfumes",
  },
};

// 🚀 Cor da barra do navegador no celular
export const viewport: Viewport = {
  themeColor: "#6A283A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        
        {/* 🚀 Adiciona o componente no layout base. Ele ficará oculto até o navegador permitir a instalação */}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}