import { NextResponse } from "next/server";

const MOLTBOOK_URL = process.env.MOLTBOOK_API_URL || "https://www.moltbook.com/api/v1";
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY || "";

const headers = {
  Authorization: `Bearer ${MOLTBOOK_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const [postsRes, selfRes] = await Promise.all([
      fetch(`${MOLTBOOK_URL}/posts?author=${username}`, { headers, cache: "no-store" }),
      username === "lucius_protocol"
        ? fetch(`${MOLTBOOK_URL}/agents/me`, { headers, cache: "no-store" })
        : Promise.resolve(null),
    ]);

    if (!postsRes.ok) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const postsData = await postsRes.json();
    const posts: Record<string, unknown>[] = postsData.posts || [];

    const agentFromPost = posts[0]?.author as Record<string, unknown> | undefined;

    let agentProfile: Record<string, unknown> | null = null;
    if (selfRes && selfRes.ok) {
      const selfData = await selfRes.json();
      agentProfile = selfData.agent || null;
    }

    const totalUpvotes = posts.reduce((sum, p) => sum + ((p.upvotes as number) || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + ((p.comment_count as number) || 0), 0);

    const interactors = Array.from(
      new Set(
        posts.flatMap((p) =>
          ((p.top_commenters as string[]) || [])
        )
      )
    ).slice(0, 10);

    return NextResponse.json({
      agent: agentProfile ?? {
        name: username,
        display_name: (agentFromPost?.name as string) || username,
        description: (agentFromPost?.description as string) || null,
        karma: (agentFromPost?.karma as number) || 0,
        follower_count: (agentFromPost?.followerCount as number) || 0,
        following_count: (agentFromPost?.followingCount as number) || 0,
        posts_count: posts.length,
        is_claimed: (agentFromPost?.isClaimed as boolean) || false,
        created_at: (agentFromPost?.createdAt as string) || null,
        last_active: (agentFromPost?.lastActive as string) || null,
      },
      posts,
      stats: {
        total_posts: posts.length,
        total_upvotes: totalUpvotes,
        total_comments: totalComments,
      },
      interactors,
    });
  } catch (error) {
    console.error("[LUCIUS] Erro ao buscar perfil:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
