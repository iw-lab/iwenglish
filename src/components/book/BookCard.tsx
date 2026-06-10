import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { cn } from "@/lib/utils";
import type { CefrLevel } from "@/types/book";
import { BookOpen } from "lucide-react";

export function BookCard({
  slug,
  title,
  title_ko,
  level,
  summary_ko,
  coverUrl,
  meta,
  comingSoon,
}: {
  slug: string;
  title: string;
  title_ko: string;
  level: CefrLevel;
  summary_ko: string;
  coverUrl?: string;
  meta?: string;
  comingSoon?: boolean;
}) {
  const inner = (
    <Card
      className={cn(
        "group h-full overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md",
        comingSoon && "opacity-90",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`${title} 표지`}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/20 to-accent/20">
            <BookOpen className="h-10 w-10 text-primary/50" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <LevelBadge level={level} />
        </div>
        {comingSoon && (
          <span className="absolute right-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            준비 중
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="font-bold leading-tight">{title}</h3>
        <p className="font-ko text-sm text-muted-foreground">{title_ko}</p>
        <p className="line-clamp-2 font-ko text-xs text-muted-foreground/80">
          {summary_ko}
        </p>
        {meta && <p className="pt-0.5 text-[11px] text-muted-foreground">{meta}</p>}
      </div>
    </Card>
  );

  if (comingSoon) return <div className="block">{inner}</div>;
  return (
    <Link href={`/book/${slug}`} prefetch={false} className="block">
      {inner}
    </Link>
  );
}
