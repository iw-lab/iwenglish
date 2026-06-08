import { NextResponse } from "next/server";

/** Cloudflare D1 바인딩(DB) 가져오기 — 미배포/로컬이면 null */
async function getDB(): Promise<D1Database | null> {
  try {
    const mod = await import("@opennextjs/cloudflare");
    const ctx = mod.getCloudflareContext();
    return (ctx?.env as { DB?: D1Database })?.DB ?? null;
  } catch {
    return null;
  }
}

interface D1Database {
  prepare: (q: string) => {
    bind: (...args: unknown[]) => {
      all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
      run: () => Promise<unknown>;
    };
  };
}

/** GET /api/sync?id=CODE → { available, data: { progress?, wordbook? } } */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "no id" }, { status: 400 });
  const db = await getDB();
  if (!db) return NextResponse.json({ available: false, data: {} });
  const { results } = await db
    .prepare("SELECT key, value FROM sync_store WHERE sync_id = ?")
    .bind(id)
    .all<{ key: string; value: string }>();
  const data: Record<string, unknown> = {};
  for (const r of results) {
    try {
      data[r.key] = JSON.parse(r.value);
    } catch {
      /* skip */
    }
  }
  return NextResponse.json({ available: true, data });
}

/** POST /api/sync { id, key, value } → upsert */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    key?: string;
    value?: unknown;
  };
  const id = body.id?.trim();
  const key = body.key?.trim();
  if (!id || !key) return NextResponse.json({ error: "bad" }, { status: 400 });
  const db = await getDB();
  if (!db) return NextResponse.json({ available: false });
  await db
    .prepare(
      "INSERT INTO sync_store (sync_id, key, value, updated_at) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(sync_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(id, key, JSON.stringify(body.value ?? null), Date.now())
    .run();
  return NextResponse.json({ ok: true });
}
