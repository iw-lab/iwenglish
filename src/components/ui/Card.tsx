import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card bg-card text-card-foreground border border-border shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
