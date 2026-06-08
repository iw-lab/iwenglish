import { LearnClient } from "@/components/learn/LearnClient";

export default function LearnPage() {
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">단어 학습</h1>
        <p className="font-ko text-sm text-muted-foreground">
          간격반복(SRS) 플래시카드로 단어를 오래 기억해요.
        </p>
      </section>

      <LearnClient />
    </div>
  );
}
