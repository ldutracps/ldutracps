import { NextResponse } from "next/server";

const MOLTBOOK_URL = process.env.MOLTBOOK_API_URL || "https://www.moltbook.com/api/v1";
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY || "";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

async function fetchWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (error) {
    if (attempt >= MAX_RETRIES) throw error;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    return fetchWithRetry(url, options, attempt + 1);
  }
}

export async function GET() {
  try {
    const res = await fetchWithRetry(
      `${MOLTBOOK_URL}/posts`,
      { headers: { Authorization: `Bearer ${MOLTBOOK_KEY}` }, cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch feed." }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[LUCIUS] Erro ao buscar feed após retries:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
