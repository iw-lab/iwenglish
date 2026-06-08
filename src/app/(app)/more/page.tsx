import Link from "next/link";
import { SettingsPanel } from "@/components/shell/SettingsPanel";
import { SyncCard } from "@/components/sync/SyncCard";
import { Card } from "@/components/ui/Card";
import { featureAvailability } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { CreditCard, GraduationCap, LogIn } from "lucide-react";

export default async function MorePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">더보기</h1>

      <Card className="flex items-center gap-3 p-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
          {user ? (user.email?.[0]?.toUpperCase() ?? "U") : <LogIn className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          {user ? (
            <>
              <p className="truncate font-semibold">{user.email}</p>
              <p className="text-xs text-muted-foreground">로그인됨</p>
            </>
          ) : (
            <>
              <p className="font-semibold">로그인이 필요해요</p>
              <p className="font-ko text-xs text-muted-foreground">
                {featureAvailability.supabase()
                  ? "진도·단어장을 저장하려면 로그인하세요."
                  : "Supabase 키 설정 후 로그인 기능이 활성화돼요."}
              </p>
            </>
          )}
        </div>
        {featureAvailability.supabase() && (
          <Link
            href={user ? "/auth/signout" : "/auth"}
            className="rounded-chip bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {user ? "로그아웃" : "로그인"}
          </Link>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/teacher">
          <Card className="flex flex-col items-center gap-1.5 p-4 text-center transition hover:bg-muted">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold">교사 모드</span>
          </Card>
        </Link>
        <Link href="/pricing">
          <Card className="flex flex-col items-center gap-1.5 p-4 text-center transition hover:bg-muted">
            <CreditCard className="h-6 w-6 text-accent" />
            <span className="text-sm font-semibold">요금제</span>
          </Card>
        </Link>
      </div>

      <SyncCard />

      <SettingsPanel />

      <p className="pt-2 text-center text-xs text-muted-foreground">
        EchoTale · 에코테일 — 영어 그림책 낭독·쉐도잉 학습
      </p>
    </div>
  );
}
