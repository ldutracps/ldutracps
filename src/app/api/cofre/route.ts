import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IDEAS_DIR = path.join(process.cwd(), "public", "ideas");
const CATEGORIAS = ["frutiferas", "apoio", "manifestos"] as const;

function lerCategoria(categoria: string): unknown[] {
  const dir = path.join(IDEAS_DIR, categoria);
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a: any, b: any) =>
        new Date(b.data_interceptacao || 0).getTime() - new Date(a.data_interceptacao || 0).getTime()
      );
  } catch { return []; }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get("categoria");

  if (!categoria) {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIAS) {
      counts[cat] = lerCategoria(cat).length;
    }
    return NextResponse.json(counts);
  }

  return NextResponse.json(lerCategoria(categoria));
}
