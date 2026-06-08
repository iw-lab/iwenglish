import { createClient } from "@supabase/supabase-js";
import { env, requireServerEnv } from "@/lib/env";

/**
 * 서비스 롤 클라이언트 (RLS 우회) — 시드 스크립트/서버 관리 작업 전용.
 * ⚠️ 절대 클라이언트 번들에 import 하지 말 것.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl, requireServerEnv("supabaseServiceRole"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
