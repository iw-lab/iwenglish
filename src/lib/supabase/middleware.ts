import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, featureAvailability } from "@/lib/env";

/** 세션 쿠키 갱신 (App Router 미들웨어). 키 없으면 그대로 통과. */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!featureAvailability.supabase()) return response;

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
