import { WordbookList } from "@/components/wordbook/WordbookList";

export default function WordbookPage() {
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">단어장</h1>
        <p className="font-ko text-sm text-muted-foreground">
          책에서 모은 단어를 발음·뜻과 함께 다시 만나요. (이 기기에 저장)
        </p>
      </section>

      <WordbookList />
    </div>
  );
}
