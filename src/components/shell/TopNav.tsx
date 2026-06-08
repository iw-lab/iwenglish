"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Library,
  GraduationCap,
  NotebookPen,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "서재", icon: Library, match: (p: string) => p === "/" || p.startsWith("/book") || p.startsWith("/read") },
  { href: "/learn", label: "학습", icon: GraduationCap, match: (p: string) => p.startsWith("/learn") },
  { href: "/wordbook", label: "단어장", icon: NotebookPen, match: (p: string) => p.startsWith("/wordbook") },
  { href: "/progress", label: "진도", icon: BarChart3, match: (p: string) => p.startsWith("/progress") },
  { href: "/more", label: "설정", icon: Settings, match: (p: string) => p.startsWith("/more") },
];

/** 데스크톱 상단 네비 (모바일은 BottomNav 사용) */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="주요 메뉴" className="hidden items-center gap-1 lg:flex">
      {tabs.map((t) => {
        const active = t.match(pathname);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-chip px-3 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
