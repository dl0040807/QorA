import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Answer } from "@/lib/supabase/types";

const MIN_ANSWERS = 3;

interface Perspective {
  label: string;
  percentage: number;
  example_quote: string;
}

interface AnswerItem {
  id: string;
  answer_text: string;
  answerer_light_profile: {
    age_group?: string | null;
    occupation?: string | null;
    mbti?: string | null;
  };
}

interface SynthesisResult {
  perspectives: Perspective[];
  summary: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  // Fetch concern + answers in parallel with cache check
  const [concernRes, answersRes] = await Promise.all([
    supabaseAdmin
      .from("concerns")
      .select("id, content, status")
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("answers")
      .select("id, answer_text, answerer_light_profile, created_at")
      .eq("concern_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (concernRes.error || !concernRes.data) {
    return NextResponse.json({ error: "Concern not found." }, { status: 404 });
  }
  if (answersRes.error) {
    return NextResponse.json({ error: answersRes.error.message }, { status: 500 });
  }

  const concern = concernRes.data;
  const answerList = (answersRes.data ?? []) as Pick<Answer, "id" | "answer_text" | "answerer_light_profile">[];
  const count = answerList.length;

  if (count < MIN_ANSWERS) {
    return NextResponse.json({ ready: false, count, required: MIN_ANSWERS });
  }

  // Check cache — valid if concern_id matches and answer_count hasn't changed
  const { data: cached } = await supabaseAdmin
    .from("concern_synthesis_cache")
    .select("answer_count, cache")
    .eq("concern_id", id)
    .maybeSingle();

  if (cached && cached.answer_count === count) {
    // Cache hit — return stored result immediately, no Claude call
    return NextResponse.json({
      ready: true,
      count,
      ...(cached.cache as SynthesisResult),
      answers: answerList as AnswerItem[],
    });
  }

  // Cache miss or stale — call Claude
  const answersText = answerList
    .map((a, i) => {
      const profile = a.answerer_light_profile;
      const profileStr = [
        profile.age_group ? `age: ${profile.age_group}` : null,
        profile.occupation ? `occupation: ${profile.occupation}` : null,
        profile.mbti ? `MBTI: ${profile.mbti}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      return `[Answer ${i + 1}${profileStr ? ` (${profileStr})` : ""}]\n${a.answer_text}`;
    })
    .join("\n\n");

  const prompt = `Analyse the anonymous answers to the following concern, group them by perspective, and write a neutral summary.

[Concern]
${concern.content}

[Answers (total ${count})]
${answersText}

Rules:
- Group into 2–5 perspectives. Merge similar viewpoints into one.
- The percentages must sum to exactly 100.
- example_quote is one representative sentence from an actual answer for that perspective (no quotation marks).
- summary is 2–3 sentences, neutral English, summarising the overall range of views without giving direct advice.
- Exclude any inappropriate or offensive answers from the analysis.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: "synthesise_answers",
          description: "Groups answers by perspective and returns a neutral summary.",
          input_schema: {
            type: "object" as const,
            properties: {
              perspectives: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string", description: "Perspective name (e.g. Keep going, Move on)" },
                    percentage: { type: "integer", description: "Integer 0–100, total must equal 100" },
                    example_quote: { type: "string", description: "Representative sentence for this perspective" },
                  },
                  required: ["label", "percentage", "example_quote"],
                },
              },
              summary: {
                type: "string",
                description: "Neutral summary of all answers (2–3 sentences)",
              },
            },
            required: ["perspectives", "summary"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "synthesise_answers" },
    });

    const toolBlock = message.content.find((b) => b.type === "tool_use");
    if (!toolBlock || !("input" in toolBlock)) {
      return NextResponse.json({ error: "Did not receive AI synthesis result." }, { status: 502 });
    }

    const result = toolBlock.input as SynthesisResult;

    // Upsert cache (insert on first synthesis, update when answer count grows)
    await supabaseAdmin
      .from("concern_synthesis_cache")
      .upsert(
        { concern_id: id, answer_count: count, cache: result },
        { onConflict: "concern_id" },
      );

    return NextResponse.json({
      ready: true,
      count,
      ...result,
      answers: answerList as AnswerItem[],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
