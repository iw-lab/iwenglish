import { NextResponse } from "next/server";
import { normalizeWord } from "@/lib/utils";
import { createServerSupabase, getCurrentUser } from "@/lib/supabase/server";

/** POST /api/wordbook { word } → SRS 단어장에 추가(due=오늘) */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const supabase = await createServerSupabase();
  if (!supabase)
    return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { word?: string };
  const word = normalizeWord(body.word ?? "");
  if (!word) return NextResponse.json({ error: "no word" }, { status: 400 });

  const { error } = await supabase.from("wordbook").upsert(
    {
      user_id: user.id,
      word,
      due_date: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "user_id,word", ignoreDuplicates: true },
  );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
