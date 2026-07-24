"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BookOpenCheck, Mic, Clock, Brain } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  masteredCount,
  recentDays,
  studiedCount,
  useProgress,
} from "@/store/progress";
import { MIN_COVERAGE } from "@/lib/learning";

/**
 * 보호자용 주간 리포트.
 *
 * 여기 숫자는 전부 "검증된 활동"이다 — 문장을 끝까지 들은 것만 완독으로,
 * 객관식으로 맞힌 것만 단어로 센다. 그래서 "몇 문장을 따라 말했는지" 같은
 * 문장을 자신 있게 쓸 수 있다.
 */
export function ParentReport() {
  const s = useProgress();
  const days = recentDays(s, 7);

  const data = days.map((d) => ({
    // 06-24 → 6/24
    day: `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8, 10))}`,
    단어: d.stat.words,
    쉐도잉: d.stat.shadow,
    책: d.stat.books,
  }));

  const sum = days.reduce(
    (a, d) => ({
      words: a.words + d.stat.words,
      shadow: a.shadow + d.stat.shadow,
      books: a.books + d.stat.books,
      minutes: a.minutes + d.stat.minutes,
    }),
    { words: 0, shadow: 0, books: 0, minutes: 0 },
  );

  const activeDays = days.filter(
    (d) => d.stat.words + d.stat.shadow + d.stat.books > 0,
  ).length;

  return (
    <div className="space-y-5">
      {/* 한 줄 요약 */}
      <Card className="space-y-1.5 p-5">
        <h2 className="font-bold">이번 주 요약</h2>
        <p className="font-ko text-lg leading-relaxed">
          지난 7일 동안 <b className="text-primary">{activeDays}일</b> 학습했고,
          책을 <b className="text-primary">{sum.books}권</b> 끝까지 읽었어요.
          쉐도잉으로 <b className="text-accent">{sum.shadow}문장</b>을 따라
          말했고, 단어 <b className="text-good">{sum.words}개</b>를 문제로
          맞혔어요.
        </p>
        <p className="font-ko text-xs text-muted-foreground">
          * 완독은 책의 문장을 {Math.round(MIN_COVERAGE * 100)}% 이상 끝까지 들은
          경우만, 단어는 객관식으로 맞힌 경우만 집계합니다. 건너뛰기로는 기록이
          쌓이지 않습니다.
        </p>
      </Card>

      {/* 주간 그래프 */}
      <Card className="space-y-2 p-4">
        <h2 className="font-bold">최근 7일</h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="단어" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="쉐도잉" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="책" fill="var(--good)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 누적 지표 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={BookOpenCheck}
          value={s.booksFinished.length}
          label="검증 완독(누적)"
        />
        <Metric icon={Mic} value={s.shadowTotal ?? 0} label="쉐도잉 문장(누적)" />
        <Metric icon={Brain} value={masteredCount(s)} label="마스터 단어" />
        <Metric icon={Clock} value={sum.minutes} label="이번 주 학습(분)" />
      </div>

      {/* 어휘 진행 */}
      <Card className="space-y-2 p-5">
        <h2 className="font-bold">어휘 진행</h2>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>학습을 시작한 단어</span>
          <span className="font-bold text-foreground">{studiedCount(s)}개</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>마스터(5단계 도달)</span>
          <span className="font-bold text-foreground">{masteredCount(s)}개</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>이해 퀴즈 통과한 책</span>
          <span className="font-bold text-foreground">
            {Object.values(s.quizPassed ?? {}).filter(Boolean).length}권
          </span>
        </div>
      </Card>

      {/* 최근 읽기 기록 */}
      {s.sessions.length > 0 && (
        <Card className="divide-y divide-border">
          {s.sessions.slice(0, 10).map((sess, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {sess.title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {sess.mode}
              </span>
              {typeof sess.coverage === "number" && (
                <span className="shrink-0 text-xs font-bold text-good">
                  {Math.round(sess.coverage * 100)}%
                </span>
              )}
              <span className="shrink-0 text-xs text-muted-foreground">
                {sess.date}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-1 p-4">
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-2xl font-extrabold">{value}</span>
      <span className="text-center text-[11px] text-muted-foreground">
        {label}
      </span>
    </Card>
  );
}
