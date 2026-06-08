import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

export function AppShell({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col lg:max-w-6xl">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md lg:px-8">
        <span className="text-lg font-extrabold tracking-tight">
          {title ?? (
            <>
              <span className="text-primary">Echo</span>
              <span className="text-accent">Tale</span>
            </>
          )}
        </span>
        <TopNav />
        <div className="ml-auto flex items-center gap-2">{action}</div>
      </header>
      <main className="flex-1 px-4 pb-28 pt-4 lg:px-8 lg:pb-12 lg:pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
