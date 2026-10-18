import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface MatchRequestBody {
  preferenceText: string;
}

interface RankedConcern {
  concern_id: string;
  score: number;
  reason: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: MatchRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read request body." }, { status: 400 });
  }

  const { preferenceText } = body;
  if (!preferenceText?.trim()) {
    return NextResponse.json({ error: "Please enter the type of concern you want to answer." }, { status: 400 });
  }

  // Step 1: Ask Claude to expand the preference into search keywords
  const anthropic = new Anthropic({ apiKey });
  const expandMsg = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 200,
    messages: [{ role: "user", content: `The user wants to answer concerns about: "${preferenceText.trim()}"\n\nList up to 10 specific search keywords (brand names, topics, synonyms, related terms) that would match relevant concerns in a database. Return only a JSON array of lowercase strings, nothing else.` }],
  });
  let searchKeywords: string[] = [];
  try {
    const raw = expandMsg.content.find((b) => b.type === "text");
    const text = raw && "text" in raw ? raw.text : "";
    const match = text.match(/\[[\s\S]*\]/);
    searchKeywords = match ? JSON.parse(match[0]) : [];
  } catch {
    // fall back to raw word split
  }
  // Always include the raw words too
  const rawWords = preferenceText.trim().toLowerCase()
    .split(/[\s,./\\-]+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length >= 2);
  const keywords = Array.from(new Set([...searchKeywords, ...rawWords]));

  // Step 2: Search ALL open concerns by each keyword (no recency limit)
  const [recentRes, ...keywordResults] = await Promise.all([
    supabaseAdmin
      .from("concerns")
      .select("id, content, category")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    ...keywords.map((kw) =>
      supabaseAdmin
        .from("concerns")
        .select("id, content, category")
        .eq("status", "open")
        .ilike("content", `%${kw}%`)
        .limit(20),
    ),
  ]);

  if (recentRes.error) {
    return NextResponse.json({ error: recentRes.error.message }, { status: 500 });
  }

  // Merge: keyword matches first (guaranteed in Claude's pool), then recent fill
  const seen = new Set<string>();
  const concerns: { id: string; content: string; category: string | null }[] = [];
  for (const res of keywordResults) {
    for (const c of res.data ?? []) {
      if (!seen.has(c.id)) { seen.add(c.id); concerns.push(c); }
    }
  }
  for (const c of recentRes.data ?? []) {
    if (!seen.has(c.id)) { seen.add(c.id); concerns.push(c); }
  }

  if (concerns.length === 0) {
    return NextResponse.json({ rankings: [] });
  }

  // Get answer counts per concern
  const { data: answerCounts } = await supabaseAdmin
    .from("answers")
    .select("concern_id")
    .in(
      "concern_id",
      concerns.map((c) => c.id),
    );

  const countMap: Record<string, number> = {};
  (answerCounts ?? []).forEach((a) => {
    countMap[a.concern_id] = (countMap[a.concern_id] ?? 0) + 1;
  });

  const concernsText = concerns
    .map((c) => {
      const count = countMap[c.id] ?? 0;
      return `- id: ${c.id}, category: ${c.category ?? "Other"}, answers: ${count}\n  concern: ${c.content.slice(0, 200)}`;
    })
    .join("\n");

  const prompt = `An answerer has described what kind of concern they want to respond to. From the list of open concerns below, recommend the best matches ranked by relevance.

[Answerer's preference]
${preferenceText.trim()}

[Open concerns]
${concernsText}

Rules:
- Recommend up to 5 concerns.
- Match by topic, theme, and subject matter — not just category label. A concern categorised as "Other" may still be highly relevant.
- score is an integer 0–100 (relevance to the answerer's preference). Include a concern even if the score is low, as long as it is the closest match available.
- reason is one sentence explaining why this concern is a good match for this answerer.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: "rank_concerns",
          description: "Returns ranked concerns matching the answerer's preference.",
          input_schema: {
            type: "object" as const,
            properties: {
              rankings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    concern_id: { type: "string", description: "The concern's id" },
                    score: { type: "integer", description: "Relevance score 0–100" },
                    reason: { type: "string", description: "One-sentence recommendation reason" },
                  },
                  required: ["concern_id", "score", "reason"],
                },
              },
            },
            required: ["rankings"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "rank_concerns" },
    });

    const toolBlock = message.content.find((b) => b.type === "tool_use");
    if (!toolBlock || !("input" in toolBlock)) {
      return NextResponse.json({ error: "Did not receive recommendation results." }, { status: 502 });
    }

    const { rankings } = toolBlock.input as { rankings: RankedConcern[] };

    // Validate concern_ids against actual fetched IDs
    const validIds = new Set(concerns.map((c) => c.id));
    const validRankings = (rankings ?? []).filter(
      (r) => r.concern_id && validIds.has(r.concern_id),
    );

    // Enrich with concern content for display
    const enriched = validRankings.map((r) => {
      const concern = concerns.find((c) => c.id === r.concern_id);
      return {
        ...r,
        content: concern?.content ?? "",
        category: concern?.category ?? "Other",
        answer_count: countMap[r.concern_id] ?? 0,
      };
    });

    return NextResponse.json({ rankings: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
