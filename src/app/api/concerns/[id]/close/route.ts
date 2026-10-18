import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface CloseBody {
  askerSessionId: string;
  /** The asker's final resolution note — may be AI-drafted, edited, or written from scratch. */
  resolution_note: string;
}

// POST /api/concerns/[id]/close
// Marks a concern as closed and saves the asker's resolution note.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: CloseBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read request body." }, { status: 400 });
  }

  const { askerSessionId, resolution_note } = body;

  if (!askerSessionId) {
    return NextResponse.json({ error: "Session information is missing." }, { status: 400 });
  }
  if (!resolution_note?.trim()) {
    return NextResponse.json({ error: "Please write a resolution note." }, { status: 400 });
  }
  if (resolution_note.trim().length > 600) {
    return NextResponse.json({ error: "Resolution note must be 600 characters or fewer." }, { status: 400 });
  }

  // Verify ownership + concern exists
  const { data: concern, error: fetchError } = await supabaseAdmin
    .from("concerns")
    .select("id, asker_session_id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !concern) {
    return NextResponse.json({ error: "Concern not found." }, { status: 404 });
  }
  if (concern.asker_session_id !== askerSessionId) {
    return NextResponse.json({ error: "Not authorised to close this concern." }, { status: 403 });
  }
  if (concern.status === "closed") {
    return NextResponse.json({ error: "This concern is already closed." }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from("concerns")
    .update({ status: "closed", resolution_note: resolution_note.trim() })
    .eq("id", id)
    .select("id, status, resolution_note")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ concern: data });
}

// GET /api/concerns/[id]/close?synthesis=...&content=...
// Calls Claude to draft a closing message for the asker to edit.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const content = searchParams.get("content") ?? "";
  const summary = searchParams.get("summary") ?? "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }
  if (!content.trim()) {
    return NextResponse.json({ error: "Concern content is required." }, { status: 400 });
  }

  // Fetch concern to confirm it exists
  const { data: concern, error: fetchError } = await supabaseAdmin
    .from("concerns")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !concern) {
    return NextResponse.json({ error: "Concern not found." }, { status: 404 });
  }

  const prompt = `You are helping someone close out a question they posted to an anonymous advice community.

[Their original question]
${content.trim()}

${summary.trim() ? `[AI summary of the answers they received]\n${summary.trim()}\n` : ""}
Write a short, warm closing message (2–3 sentences) that the asker can post publicly to let their community know what they decided or how they are feeling after reading all the responses. The tone should be personal and genuine — not corporate. Write in first person. Do not give new advice. End on a note of gratitude.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: "draft_closing_message",
          description: "Drafts a short closing message for the asker to post.",
          input_schema: {
            type: "object" as const,
            properties: {
              draft: {
                type: "string",
                description: "A warm 2–3 sentence closing message written in first person.",
              },
            },
            required: ["draft"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "draft_closing_message" },
    });

    const toolBlock = message.content.find((b) => b.type === "tool_use");
    if (!toolBlock || !("input" in toolBlock)) {
      return NextResponse.json({ error: "Did not receive a draft." }, { status: 502 });
    }

    const { draft } = toolBlock.input as { draft: string };
    return NextResponse.json({ draft });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
