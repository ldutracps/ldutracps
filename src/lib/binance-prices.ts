/**
 * binance-api-node: `client.prices()` devolve, em runtime, um objeto
 * `{ BTCUSDT: "50000", ... }` (ver http-client.js), embora os tipos digam Array.
 * Normaliza sempre para Record<symbol, price>.
 */
export function precosBinanceComoRecord(raw: unknown): Record<string, string> {
  if (Array.isArray(raw)) {
    return Object.fromEntries(
      raw.map((p: { symbol: string; price: string }) => [p.symbol, p.price])
    );
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, string>;
  }
  return {};
}
