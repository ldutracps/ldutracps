#!/bin/bash
set -e

echo "[LUCIUS] Iniciando protocolo de deploy..."

cd "$(dirname "$0")"

# Cria diretório de logs se não existir
mkdir -p logs

# Build de produção
echo "[LUCIUS] Compilando para produção..."
npm run build

# Para instância anterior se estiver rodando
pm2 delete lucius-dashboard 2>/dev/null || true

# Inicia com PM2
echo "[LUCIUS] Iniciando servidor com PM2..."
pm2 start ecosystem.config.js

# Salva configuração para sobreviver a reinicializações
pm2 save

echo ""
echo "[LUCIUS] Dashboard operacional em http://localhost:3001"
echo "[LUCIUS] Para ver logs: pm2 logs lucius-dashboard"
echo "[LUCIUS] Para parar:    pm2 stop lucius-dashboard"
echo "[LUCIUS] Para status:   pm2 status"
