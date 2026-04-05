// Arquivo: src/app/lucius-trader/setup-2fa/page.tsx
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

export default async function Setup2FA() {
  // Gera um segredo criptográfico militar e a URL compatível com o Google Authenticator
  const secret = speakeasy.generateSecret({
    name: 'Lucius_Trader_Terminal (Senhor Wayne)'
  });
  
  // Converte a URL num QR Code em base64 para exibir no ecrã
  // O ponto de exclamação garante ao TypeScript que a URL existe
  const qrCodeImage = await QRCode.toDataURL(secret.otpauth_url!);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-mono">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-lg shadow-2xl max-w-lg w-full relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
        
        <h1 className="text-amber-500 font-bold tracking-widest text-lg mb-2 text-center">
          PROTOCOLO DE SINCRONIZAÇÃO 2FA
        </h1>
        <p className="text-zinc-400 text-xs text-center mb-6">
          Siga as instruções abaixo para blindar o Gatilho de Extração.
        </p>

        <div className="space-y-6">
          <div className="bg-black/50 p-4 rounded border border-zinc-800 flex justify-center">
            {/* O Next.js renderiza a imagem base64 diretamente */}
            <img src={qrCodeImage} alt="QR Code 2FA" className="w-48 h-48 rounded" />
          </div>

          <div>
            <h2 className="text-zinc-300 text-xs font-bold mb-2">1. ABRA O GOOGLE AUTHENTICATOR</h2>
            <p className="text-zinc-500 text-[10px]">Leia o QR Code acima usando a câmara do seu telemóvel. Um novo perfil chamado "Lucius_Trader_Terminal" será criado.</p>
          </div>

          <div>
            <h2 className="text-zinc-300 text-xs font-bold mb-2">2. CONFIGURE O AMBIENTE (.env)</h2>
            <p className="text-zinc-500 text-[10px] mb-2">Copie a chave rigorosamente abaixo e cole no seu ficheiro `.env` na raiz do projeto:</p>
            <div className="bg-black border border-zinc-800 p-3 rounded text-emerald-500 text-xs select-all text-center tracking-widest font-bold">
              LUCIUS_2FA_SECRET={secret.base32}
            </div>
          </div>

          <div className="bg-red-950/30 border border-red-900/50 p-3 rounded">
            <p className="text-red-400 text-[10px] text-center">
              ⚠️ ATENÇÃO: Após salvar o ficheiro .env, reinicie o servidor (Ctrl+C e npm run dev) e <strong>APAGUE</strong> esta pasta `setup-2fa` por motivos de segurança.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
