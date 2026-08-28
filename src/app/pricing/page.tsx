import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { env } from "@/lib/env";
import { Check, Clock, ArrowLeft } from "lucide-react";

/**
 * 요금제 안내.
 * ⚠️ 표기 원칙 — 실제 동작하는 기능만 체크(✓)로 쓰고, 미구현은 반드시 planned 로
 * 분리해 "개발 예정"으로 표시한다. 앱이 하지 않는 일을 광고하지 않는다.
 *
 * ⚠️ 결제가 꺼져 있는 동안(현재)은 **금액을 아예 표시하지 않는다.**
 * 받지도 않는 돈의 액수를 띄워 두면, 특히 교사 커뮤니티에 공유될 때
 * "유료 서비스 홍보"로 읽힌다. 지금 참인 사실은 "전부 무료" 하나뿐이고,
 * 앞으로 만들 기능은 가격표가 아니라 계획 목록으로 보여주는 게 정직하다.
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
    price: "₩9,900/월", // billingEnabled 일 때만 화면에 나온다
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

/** 앞으로 만들 기능 — 가격표가 아니라 계획 목록으로 보여준다 */
const roadmap = tiers.flatMap((t) => t.planned);

export default function PricingPage() {
  /* ── 결제가 꺼져 있는 동안(현재)의 화면 — 금액·결제 버튼을 전부 뺀다 ── */
  if (!env.billingEnabled)
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/more"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 돌아가기
        </Link>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">이용 안내</h1>
          <p className="mt-2 font-ko text-muted-foreground">
            에코테일은 <strong className="text-foreground">모든 기능이 무료</strong>예요.
            계정도 결제도 없어요.
          </p>
        </div>

        <Card className="p-6 ring-2 ring-primary">
          <h2 className="text-xl font-bold">지금 쓸 수 있는 것</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {tiers[0].features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                <span className="font-ko">{f}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="mt-4 p-6">
          <h2 className="text-lg font-bold">앞으로 만들고 싶은 것</h2>
          <p className="mt-1 font-ko text-xs text-muted-foreground">
            아직 없는 기능이에요. 만들어지면 여기에 먼저 알릴게요.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {roadmap.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-muted-foreground"
              >
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="font-ko">{f}</span>
              </li>
            ))}
          </ul>
        </Card>

        <p className="mt-6 text-center font-ko text-xs text-muted-foreground">
          학습 기록은 이 기기에만 저장돼요. 서버로 보내지 않아요.
        </p>
      </div>
    );

  /* ── 결제가 켜졌을 때의 요금제 화면 ── */
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
          필요한 만큼 골라 쓰세요.
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
              className="w-full"
            >
              {t.cta}
            </Button>
          </Card>
        ))}
      </div>

    </div>
  );
}
