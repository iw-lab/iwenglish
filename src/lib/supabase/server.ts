import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, featureAvailability } from "@/lib/env";

/** 서버 컴포넌트/route handler 용. 키가 없으면 null(골격 모드). */
export async function createServerSupabase() {
  if (!featureAvailability.supabase()) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component 에서 호출 시 무시 (middleware 가 갱신 담당)
        }
      },
    },
  });
}

/** 현재 로그인 유저 (없으면 null) */
export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
