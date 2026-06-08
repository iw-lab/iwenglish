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

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around lg:max-w-2xl">
        {tabs.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-6 w-6", active && "scale-110 transition-transform")} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
