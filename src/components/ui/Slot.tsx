import { cloneElement, isValidElement, type ReactElement } from "react";
import { cn } from "@/lib/utils";

/** 가벼운 asChild 구현: 단일 자식 엘리먼트에 className/props 병합 */
export function Slot({
  children,
  className,
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
} & Record<string, unknown>) {
  if (!isValidElement(children)) return null;
  const child = children as ReactElement<{ className?: string }>;
  return cloneElement(child, {
    ...props,
    className: cn(className, child.props.className),
  });
}
