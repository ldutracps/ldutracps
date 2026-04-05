"use server";

import Binance from "binance-api-node";
import { precosBinanceComoRecord } from "@/lib/binance-prices";
import { prisma } from "@/lib/prisma";

/**
 * Central de inteligência: Binance + Prisma (histórico de extrações).
 * Exportada como obterDadosReais (compat) e getDadosMercadoReal (alias).
 */
export async function obterDadosReais() {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn("[LUCIUS_WARNING] Chaves Binance ausentes. Modo Simulação para Localhost.");
    return {
      success: true as const,
      precoXRP: "0.62",
      patrimonioTotal: "19.14",
      ativos: [
        {
          coin: "USDT",
          amount: "19.14",
          valorEmBRL: "95.00",
          historicoPrecos: Array(10).fill(5),
        },
        {
          coin: "XRP",
          amount: "100",
          valorEmBRL: "310.00",
          historicoPrecos: Array(10).fill(3.1),
        },
      ],
      ordens: [] as { id: string; asset: string; amount: string; time: string; status: string }[],
      modo: "SIMULADO" as const,
    };
  }

  const client = Binance({ apiKey, apiSecret });

  try {
    const conta = await client.accountInfo();
    const seusAtivos = conta.balances.filter(
      (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    );

    const todosPrecos = precosBinanceComoRecord(await client.prices());

    const promessasAtivos = seusAtivos.map(async (ativo) => {
      const total = parseFloat(ativo.free) + parseFloat(ativo.locked);
      let precoEmBRL = 0;
      let symbolForCandles: string | null = null;
      let multiplicadorBRL = 1;
      let historicoPrecos: number[] = [];

      if (ativo.asset === "BRL") {
        precoEmBRL = 1;
        historicoPrecos = Array(10).fill(1);
      } else {
        if (todosPrecos[`${ativo.asset}BRL`]) {
          precoEmBRL = parseFloat(todosPrecos[`${ativo.asset}BRL`]);
          symbolForCandles = `${ativo.asset}BRL`;
        } else if (todosPrecos[`${ativo.asset}USDT`] && todosPrecos["USDTBRL"]) {
          precoEmBRL =
            parseFloat(todosPrecos[`${ativo.asset}USDT`]) * parseFloat(todosPrecos["USDTBRL"]);
          symbolForCandles = `${ativo.asset}USDT`;
          multiplicadorBRL = parseFloat(todosPrecos["USDTBRL"]);
        }

        if (symbolForCandles) {
          try {
            const candles = await client.candles({
              symbol: symbolForCandles,
              interval: "1h",
              limit: 10,
            });
            historicoPrecos = candles.map((c) => parseFloat(c.close) * multiplicadorBRL);
          } catch {
            historicoPrecos = [precoEmBRL, precoEmBRL];
          }
        } else {
          historicoPrecos = [precoEmBRL, precoEmBRL];
        }
      }

      const valorTotalAtivoBRL = total * precoEmBRL;

      return {
        coin: ativo.asset,
        amount: total.toString(),
        valorEmBRL: valorTotalAtivoBRL.toFixed(2),
        historicoPrecos,
        valorParaSoma: valorTotalAtivoBRL,
      };
    });

    const listaAtivosBruta = await Promise.all(promessasAtivos);
    const patrimonioCalculado = listaAtivosBruta.reduce((acc, ativo) => acc + ativo.valorParaSoma, 0);
    const listaAtivos = listaAtivosBruta.map(({ valorParaSoma, ...resto }) => resto);

    let precoXRP = todosPrecos["XRPBRL"] || "0.00";
    if (precoXRP === "0.00" && todosPrecos["XRPUSDT"] && todosPrecos["USDTBRL"]) {
      precoXRP = (
        parseFloat(todosPrecos["XRPUSDT"]) * parseFloat(todosPrecos["USDTBRL"])
      ).toFixed(2);
    }

    let ordens: {
      id: string;
      asset: string;
      amount: string;
      time: string;
      status: string;
    }[] = [];
    try {
      const historicoReal = await prisma.extractionLog.findMany({
        take: 8,
        orderBy: { executedAt: "desc" },
      });
      ordens = historicoReal.map((o) => ({
        id: o.id,
        asset: "EXTRAÇÃO",
        amount: o.amountUSDT.toString(),
        time: o.executedAt.toLocaleTimeString("pt-BR"),
        status: o.status,
      }));
    } catch (dbErr: unknown) {
      const dbMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error("[LUCIUS_ERROR] Histórico Prisma indisponível (radar Binance continua):", dbMsg);
    }

    return {
      success: true as const,
      patrimonioTotal: patrimonioCalculado.toString(),
      precoXRP,
      ativos: listaAtivos,
      ordens,
      modo: "REAL" as const,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[LUCIUS_ERROR] Erro no Scanner de Ativos:", message);
    return { success: false as const, error: message };
  }
}

/** Alias usado em builds/refactors recentes. */
export const getDadosMercadoReal = obterDadosReais;

/** Payload de sucesso — passar ao Goliath para evitar segunda chamada à Binance no mesmo ciclo. */
export type RadarDadosOk = Extract<Awaited<ReturnType<typeof obterDadosReais>>, { success: true }>;
