import { Card } from "@/components/ui/Card";
import { Sparkles } from "lucide-react";

/** 키 미설정(골격 모드) 안내 — 실제 콘텐츠 대신 다음 단계 표시 */
export function SetupNotice({ feature }: { feature?: string }) {
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center gap-2 text-accent">
        <Sparkles className="h-5 w-5" />
        <h2 className="font-bold">곧 채워질 공간이에요</h2>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {feature ? <b>{feature} </b> : null}
        기능은 준비됐지만, 아직 콘텐츠가 시드되지 않았어요.
        <br />
        <code className="rounded bg-muted px-1">.env.local</code> 에 Supabase ·
        Gemini · Azure 키를 채우고 책을 시드하면 실제 그림책이 나타납니다.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <code className="rounded bg-muted px-1">cp .env.local.example .env.local</code>{" "}
          후 키 입력
        </li>
        <li>
          <code className="rounded bg-muted px-1">supabase db push</code> 로 스키마 적용
        </li>
        <li>
          <code className="rounded bg-muted px-1">pnpm seed:books</code> 로 그림책 생성·시드
        </li>
      </ol>
    </Card>
  );
}
