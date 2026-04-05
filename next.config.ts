import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Permite acesso via ngrok e outros túneis em desenvolvimento
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok.app",
  ],
};

export default nextConfig;
