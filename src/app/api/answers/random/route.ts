import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data: concerns, error } = await supabaseAdmin
    .from("concerns")
    .select("id, content, category")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ concerns: concerns ?? [] });
}
