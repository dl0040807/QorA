import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AnswererLightProfile } from "@/lib/supabase/types";

interface SubmitAnswerBody {
  concern_id: string;
  answer_text: string;
  answerer_light_profile?: AnswererLightProfile;
  answerer_session_id?: string;
}

export async function POST(request: Request) {
  let body: SubmitAnswerBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read request body." }, { status: 400 });
  }

  const { concern_id, answer_text, answerer_light_profile, answerer_session_id } = body;

  if (!concern_id) {
    return NextResponse.json({ error: "Concern ID is required." }, { status: 400 });
  }
  if (!answer_text?.trim()) {
    return NextResponse.json({ error: "Please enter your answer." }, { status: 400 });
  }
  if (answer_text.trim().length > 1000) {
    return NextResponse.json({ error: "Answer must be 1000 characters or fewer." }, { status: 400 });
  }

  // Verify concern exists and is open
  const { data: concern, error: concernError } = await supabaseAdmin
    .from("concerns")
    .select("id, status")
    .eq("id", concern_id)
    .maybeSingle();

  if (concernError || !concern) {
    return NextResponse.json({ error: "Concern not found." }, { status: 404 });
  }
  if (concern.status !== "open") {
    return NextResponse.json({ error: "This concern is already closed." }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from("answers")
    .insert({
      concern_id,
      answer_text: answer_text.trim(),
      answerer_light_profile: answerer_light_profile ?? {},
      answerer_session_id: answerer_session_id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
