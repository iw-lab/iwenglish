import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { env } from "@/lib/env";
import { Check, Clock, ArrowLeft } from "lucide-react";

/**
 * 요금제 안내.
 * ⚠️ 표기 원칙 — 실제 동작하는 기능만 체크(✓)로 쓰고, 미구현은 반드시 planned 로
 * 분리해 "개발 예정"으로 표시한다. 앱이 하지 않는 일을 광고하지 않는다.
 */
const tiers = [
  {
    name: "Free",
    price: "₩0",
    desc: "지금 바로 · 현재 모든 사용자",
    features: [
      "352권 전권 열람",
      "지연 추적 쉐도잉 5단계",
      "청취 커버리지 검증 · 도장",
      "단어 학습(5유형) · 학부모 리포트",
      "계정 · 로그인 불필요",
    ],
    planned: [],
    cta: "무료로 시작",
    highlight: true,
  },
  {
    name: "Pro",
    price: "₩9,900/월",
    desc: "향후 상용화 구상",
    features: [],
    planned: ["음소단위 발음평가", "오프라인 낭독(책 팩)", "학습 리포트 PDF 내보내기"],
    cta: "Pro 시작",
    highlight: false,
  },
  {
    name: "교실",
    price: "문의",
    desc: "학급 단체 · 향후 상용화 구상",
    features: [],
    planned: ["교사 대시보드 · 과제", "학급 진도 리포트", "학생 일괄 관리"],
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
            : "지금은 모든 기능이 무료로 열려 있어요. 아래 유료 플랜은 향후 상용화 구상안이며, 시계 아이콘(개발 예정) 항목은 아직 제공하지 않습니다."}
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
              {t.planned.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="font-ko">
                    {f} <span className="text-xs">(개발 예정)</span>
                  </span>
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
        // 개발자용 환경변수명은 화면에 쓰지 않는다 — 교사·학부모·심사위원이 보는 곳이다.
        <p className="mt-6 text-center text-xs text-muted-foreground">
          지금은 모든 기능을 무료로 쓸 수 있어요. 유료 플랜은 준비 중입니다.
        </p>
      )}
    </div>
  );
}
