import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Importando a fonte Inter, excelente para leitura de painéis corporativos
const inter = Inter({ subsets: ["latin"] });

// Os metadados que aparecerão na aba do seu navegador
export const metadata: Metadata = {
  title: "Lucius Protocol | Dashboard",
  description: "Centro de Controle Autônomo e Monitoramento de Redes Neurais",
};

/**
 * RootLayout: O componente mestre. 
 * Tudo o que criarmos (O Feed, a Barra Lateral) será renderizado dentro do {children}.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      {/* Aqui injetamos a nossa estética "Clean/Corporate" na raiz:
        - bg-slate-900: O nosso fundo cinza muito escuro.
        - text-slate-200: Fonte cinza clara (não totalmente branca) para não cansar os olhos.
        - antialiased: Suaviza o traçado das fontes, deixando com aspecto premium.
        - min-h-screen: Garante que o fundo escuro ocupe a tela inteira, mesmo se estiver vazia.
      */}
      <body className={`${inter.className} bg-slate-900 text-slate-200 antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
