import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { content: string; askerSessionId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read request body." }, { status: 400 });
  }

  const { content, askerSessionId } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Please enter your concern." }, { status: 400 });
  }
  if (content.trim().length > 500) {
    return NextResponse.json({ error: "Concern must be 500 characters or fewer." }, { status: 400 });
  }
  if (!askerSessionId) {
    return NextResponse.json({ error: "Session information is missing." }, { status: 400 });
  }

  // Verify ownership
  const { data: concern, error: fetchError } = await supabaseAdmin
    .from("concerns")
    .select("id, asker_session_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !concern) {
    return NextResponse.json({ error: "Concern not found." }, { status: 404 });
  }
  if (concern.asker_session_id !== askerSessionId) {
    return NextResponse.json({ error: "Not authorised to edit this concern." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("concerns")
    .update({ content: content.trim() })
    .eq("id", id)
    .select("id, content, category")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ concern: data });
}
