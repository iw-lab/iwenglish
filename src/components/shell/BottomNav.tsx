"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, GraduationCap, NotebookPen, BarChart3, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "서재", icon: Library, match: (p: string) => p === "/" || p.startsWith("/book") },
  { href: "/learn", label: "학습", icon: GraduationCap, match: (p: string) => p.startsWith("/learn") },
  { href: "/wordbook", label: "단어장", icon: NotebookPen, match: (p: string) => p.startsWith("/wordbook") },
  { href: "/progress", label: "진도", icon: BarChart3, match: (p: string) => p.startsWith("/progress") },
  { href: "/more", label: "더보기", icon: Menu, match: (p: string) => p.startsWith("/more") },
];

/** 플로팅 필 바텀 네비 (모바일) */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.625rem)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around rounded-3xl border border-border/60 bg-card/85 shadow-[0_10px_30px_-12px_oklch(0_0_0/0.25)] backdrop-blur-xl">
        {tabs.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold"
              >
                <span
                  className={cn(
                    "grid h-8 w-14 place-items-center rounded-full transition-all duration-200",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[22px] w-[22px] transition-transform",
                      active && "scale-110",
                    )}
                  />
                </span>
                <span className={active ? "text-primary" : "text-muted-foreground"}>
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
