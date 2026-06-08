"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, featureAvailability } from "@/lib/env";

/** 브라우저용 Supabase 클라이언트. 키가 없으면 null(골격 모드). */
export function createClient() {
  if (!featureAvailability.supabase()) return null;
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
