import "./globals.css";

export const metadata = {
  title: "O Mundo dos Perfumes",
  description: "Sistema de Gestão e PDV",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}