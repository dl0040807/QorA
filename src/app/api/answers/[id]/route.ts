import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { answer_text: string; answererSessionId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read request body." }, { status: 400 });
  }

  const { answer_text, answererSessionId } = body;

  if (!answer_text?.trim()) {
    return NextResponse.json({ error: "Please enter your answer." }, { status: 400 });
  }
  if (answer_text.trim().length > 1000) {
    return NextResponse.json({ error: "Answer must be 1000 characters or fewer." }, { status: 400 });
  }
  if (!answererSessionId) {
    return NextResponse.json({ error: "Session information is missing." }, { status: 400 });
  }

  // Verify ownership
  const { data: answer, error: fetchError } = await supabaseAdmin
    .from("answers")
    .select("id, answerer_session_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !answer) {
    return NextResponse.json({ error: "Answer not found." }, { status: 404 });
  }
  if (!answer.answerer_session_id || answer.answerer_session_id !== answererSessionId) {
    return NextResponse.json({ error: "Not authorised to edit this answer." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("answers")
    .update({ answer_text: answer_text.trim() })
    .eq("id", id)
    .select("id, answer_text")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ answer: data });
}
