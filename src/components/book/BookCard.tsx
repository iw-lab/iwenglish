import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { StampBadge } from "@/components/book/StampBadge";
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
  shelf,
}: {
  slug: string;
  title: string;
  title_ko: string;
  level: CefrLevel;
  summary_ko: string;
  coverUrl?: string;
  meta?: string;
  comingSoon?: boolean;
  /** 가로 선반 모드 — 고정 폭 + 스냅 */
  shelf?: boolean;
}) {
  const inner = (
    <Card
      className={cn(
        "card-lift group h-full overflow-hidden border-border/60",
        comingSoon && "opacity-80 saturate-50",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`${title} 표지`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/20 to-accent/20">
            <BookOpen className="h-10 w-10 text-primary/50" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <LevelBadge level={level} />
        </div>
        {comingSoon ? (
          <span className="absolute right-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-bold text-muted-foreground backdrop-blur-sm">
            준비 중
          </span>
        ) : (
          <StampBadge slug={slug} />
        )}
      </div>
      <div className="space-y-0.5 p-2.5">
        <h3 className="truncate text-sm font-extrabold leading-tight" title={title}>
          {title}
        </h3>
        <p className="truncate font-ko text-xs text-muted-foreground" title={title_ko}>
          {title_ko}
        </p>
        <p className="sr-only">{summary_ko}</p>
        {meta && (
          <p className="pt-0.5 text-[10px] font-medium text-muted-foreground/70">
            {meta}
          </p>
        )}
      </div>
    </Card>
  );

  const cls = cn("block", shelf && "w-36 flex-none snap-start sm:w-40");
  if (comingSoon) return <div className={cls}>{inner}</div>;
  return (
    <Link
      href={`/book/${slug}`}
      prefetch={false}
      className={cls}
      aria-label={`${title_ko} 읽기`}
    >
      {inner}
    </Link>
  );
}
