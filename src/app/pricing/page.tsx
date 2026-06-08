import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { env } from "@/lib/env";
import { Check, ArrowLeft } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "₩0",
    desc: "가볍게 시작",
    features: ["하루 책 5권", "쭉 읽기 · 문장 · 단어 탭", "기본 쉐도잉"],
    cta: "무료로 시작",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₩9,900/월",
    desc: "제대로 말하기까지",
    features: [
      "모든 책 무제한",
      "6단계 쉐도잉 사다리",
      "음소단위 정밀 발음평가",
      "오프라인 낭독",
      "학습 리포트 PDF",
    ],
    cta: "Pro 시작",
    highlight: true,
  },
  {
    name: "교실",
    price: "문의",
    desc: "학급 단체",
    features: ["전 기능 무료 개방", "교사 대시보드 · 과제", "학급 진도 리포트", "학생 일괄 관리"],
    cta: "교실 도입 문의",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/more"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 돌아가기
      </Link>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">요금제</h1>
        <p className="mt-2 font-ko text-muted-foreground">
          {env.billingEnabled
            ? "필요한 만큼 골라 쓰세요."
            : "지금은 교실 모드 — 모든 기능이 무료로 열려 있어요."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((t) => (
          <Card
            key={t.name}
            className={
              "flex flex-col p-6 " +
              (t.highlight ? "ring-2 ring-primary" : "")
            }
          >
            <div className="mb-4">
              <h2 className="text-xl font-bold">{t.name}</h2>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
              <p className="mt-2 text-2xl font-extrabold">{t.price}</p>
            </div>
            <ul className="mb-6 flex-1 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                  <span className="font-ko">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              variant={t.highlight ? "primary" : "outline"}
              disabled={!env.billingEnabled}
              className="w-full"
            >
              {env.billingEnabled ? t.cta : "교실 모드 (무료)"}
            </Button>
          </Card>
        ))}
      </div>

      {!env.billingEnabled && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          상용화 시 <code>NEXT_PUBLIC_BILLING_ENABLED=true</code> + Stripe 연결로
          전환됩니다. (코드 재작성 불필요)
        </p>
      )}
    </div>
  );
}
