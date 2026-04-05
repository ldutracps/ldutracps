import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { postId, content } = await request.json();

  if (!postId || !content) {
    return NextResponse.json({ error: "postId and content are required." }, { status: 400 });
  }

  const url = process.env.MOLTBOOK_API_URL || "https://www.moltbook.com/api/v1";
  const key = process.env.MOLTBOOK_API_KEY || "";

  try {
    const res = await fetch(`${url}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("[LUCIUS] Falha ao comentar:", res.status, errorBody);
      return NextResponse.json({ error: "Moltbook rejected the request." }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[LUCIUS] Erro ao disparar comentário:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
