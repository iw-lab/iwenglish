import Link from "next/link";
import { SettingsPanel } from "@/components/shell/SettingsPanel";
import { Card } from "@/components/ui/Card";
import { CreditCard, Smartphone } from "lucide-react";

export default function MorePage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">더보기</h1>

      <Card className="flex items-center gap-3 p-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">계정 없이 바로 사용</p>
          <p className="font-ko text-xs text-muted-foreground">
            로그인이 필요 없어요. 진도·단어장은 이 기기에 저장됩니다.
          </p>
        </div>
      </Card>

      <Link href="/pricing">
        <Card className="flex flex-col items-center gap-1.5 p-4 text-center transition hover:bg-muted">
          <CreditCard className="h-6 w-6 text-accent" />
          <span className="text-sm font-semibold">요금제</span>
        </Card>
      </Link>

      <SettingsPanel />

      <p className="pt-2 text-center text-xs text-muted-foreground">
        EchoTale · 에코테일 — 영어 그림책 낭독·쉐도잉 학습
      </p>
    </div>
  );
}
