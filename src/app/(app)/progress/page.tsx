import { ProgressClient } from "@/components/progress/ProgressClient";

export default function ProgressPage() {
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">진도</h1>
        <p className="font-ko text-sm text-muted-foreground">
          읽고 학습한 만큼 레벨이 오르고 업적이 열려요. (이 기기에 저장)
        </p>
      </section>

      <ProgressClient />
    </div>
  );
}
