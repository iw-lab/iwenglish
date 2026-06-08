import { Card } from "@/components/ui/Card";
import { SetupNotice } from "@/components/shell/SetupNotice";
import { featureAvailability } from "@/lib/env";
import { Users, BookMarked, FileText } from "lucide-react";

export default function TeacherPage() {
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">교사 모드</h1>
        <p className="font-ko text-sm text-muted-foreground">
          교실을 만들고 학생에게 책을 배정해 진도를 한눈에.
        </p>
      </section>

      {!featureAvailability.supabase() ? (
        <SetupNotice feature="교사 대시보드" />
      ) : (
        <div className="space-y-3">
          <Card className="flex items-center gap-3 p-4">
            <Users className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">교실 만들기</p>
              <p className="font-ko text-xs text-muted-foreground">
                참여 코드를 발급해 학생을 초대하세요.
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <BookMarked className="h-6 w-6 text-accent" />
            <div className="flex-1">
              <p className="font-semibold">책 과제 배정</p>
              <p className="font-ko text-xs text-muted-foreground">
                레벨별 그림책을 마감일과 함께 배정.
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <FileText className="h-6 w-6 text-good" />
            <div className="flex-1">
              <p className="font-semibold">학급 진도 리포트 (PDF)</p>
              <p className="font-ko text-xs text-muted-foreground">
                낭독 분·발음 점수·퀴즈·단어 수를 PDF로.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
