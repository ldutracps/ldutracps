// Arquivo: src/app/lucius-trader/layout.tsx
import { ReactNode } from "react";

export default function LuciusTraderLayout({ children }: { children: ReactNode }) {
  return (
    // Fundo escuro absoluto (zinc-950) para fadiga visual zero
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {children}
    </div>
  );
}
