import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface CreateConcernBody {
  content: string;
  askerSessionId: string;
  userCategory?: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: CreateConcernBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read request body." }, { status: 400 });
  }

  const { content, askerSessionId, userCategory } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Please enter your concern." }, { status: 400 });
  }
  if (content.trim().length > 500) {
    return NextResponse.json({ error: "Concern must be 500 characters or fewer." }, { status: 400 });
  }
  if (!askerSessionId) {
    return NextResponse.json({ error: "Session information is missing." }, { status: 400 });
  }

  // If the user supplied their own category, skip Claude and use it directly.
  if (userCategory?.trim()) {
    const { data, error } = await supabaseAdmin
      .from("concerns")
      .insert({
        content: content.trim(),
        category: userCategory.trim(),
        status: "open",
        asker_session_id: askerSessionId,
      })
      .select("id, category")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data.id, category: data.category });
  }

  const prompt = `Read the following concern and assign it a short category label.

[Concern]
${content}

Create a concise category label that best describes the topic (e.g. "Sports", "Fashion", "Finance", "Parenting", "Career", "Health", "Travel", etc.).
Rules:
- Title-case, 1–3 words maximum
- Be specific and descriptive — do not default to generic labels
- If a crisis situation is detected (self-harm, suicidal ideation, etc.), return exactly "Crisis"`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: "classify_concern",
          description: "Classifies the category of a concern.",
          input_schema: {
            type: "object" as const,
            properties: {
              category: {
                type: "string",
                description: "A short, specific, title-case category label (1–3 words) that best describes the concern topic. Use \"Crisis\" only for self-harm or suicidal content.",
              },
            },
            required: ["category"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "classify_concern" },
    });

    const toolBlock = message.content.find((b) => b.type === "tool_use");
    if (!toolBlock || !("input" in toolBlock)) {
      return NextResponse.json({ error: "Did not receive a classification result." }, { status: 502 });
    }

    const { category } = toolBlock.input as { category: string };

    // Crisis safety gate — save nothing, return guidance message
    if (category === "Crisis") {
      return NextResponse.json(
        {
          crisis: true,
          message:
            "It sounds like you're going through a really hard time. Please reach out to a professional.\nNational Suicide Prevention Lifeline: 988 (call or text, 24/7)\nCrisis Text Line: text HOME to 741741",
        },
        { status: 200 },
      );
    }

    // Insert via admin client — askerSessionId is the Supabase anon user UUID,
    // but we use admin here to avoid client-side env vars being needed server-side.
    const { data, error } = await supabaseAdmin
      .from("concerns")
      .insert({
        content: content.trim(),
        category: category,
        status: "open",
        asker_session_id: askerSessionId,
      })
      .select("id, category")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, category: data.category });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const id = searchParams.get("id");

  // Fetch single concern by id (for concern result page)
  if (id) {
    const { data, error } = await supabaseAdmin
      .from("concerns")
      .select("id, content, category, status, created_at, asker_session_id")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Concern not found." }, { status: 404 });
    }
    return NextResponse.json({ concern: data });
  }

  // Fetch all concerns by asker session
  if (!sessionId) {
    return NextResponse.json({ concerns: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("concerns")
    .select("id, content, category, status, created_at")
    .eq("asker_session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ concerns: data ?? [] });
}
