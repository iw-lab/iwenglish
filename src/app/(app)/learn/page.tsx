import { LearnClient } from "@/components/learn/LearnClient";

export default function LearnPage() {
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">단어 학습</h1>
        <p className="font-ko text-sm text-muted-foreground">
          듣기·뜻·빈칸·철자 문제로 진짜 아는지 확인하고, 간격반복(SRS)으로 오래
          기억해요.
        </p>
      </section>

      <LearnClient />
    </div>
  );
}
