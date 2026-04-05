// Arquivo: src/app/lucius-trader/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LuciusLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Acesso Negado. Credenciais Inválidas.");
    } else {
      router.push("/lucius-trader");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-8 rounded-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600"></div>
        
        <h1 className="text-emerald-500 font-mono text-xl tracking-widest mb-2 text-center">
          PROTOCOLO DE ACESSO
        </h1>
        <p className="text-zinc-500 text-xs font-mono text-center mb-8">
          SISTEMA RESTRITO // LUCIUS_TRADER
        </p>

        {error && (
          <div className="bg-red-950 border border-red-900 text-red-500 text-xs font-mono p-3 rounded mb-4 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-xs font-mono mb-1">CODINOME</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-mono mb-1">CHAVE TÁTICA</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white font-mono text-sm py-3 rounded mt-6 transition-all border border-zinc-700 hover:border-emerald-500"
          >
            INICIAR SESSÃO
          </button>
        </div>
      </form>
    </div>
  );
}
