export type ModeKind = "classic" | "time" | "survival" | "rule" | "big" | "daily";
export const MODE_KINDS: readonly ModeKind[];
export interface GbMode { id: string; kind: ModeKind; icon?: string; label: string; desc: string; best?: string }
export function renderModeCards(container: HTMLElement, modes: GbMode[], onPick: (id: string) => void): void;
export function setModeBest(container: HTMLElement, id: string, text: string): void;
export class ModeClock {
  constructor(o?: { startMs?: number; onTick?: (leftMs: number, urgent: boolean) => void; onEnd?: () => void; urgentMs?: number });
  left: number; running: boolean;
  start(): void; add(ms: number): void; pause(): void; stop(): void;
}
export function fmtClock(ms: number): string;
export type ModeBarPart = { type: "time"; ms: number; urgent?: boolean } | { type: "hearts"; left: number; max: number } | { type: "round"; n: number } | { type: "text"; text?: string; html?: string };
export function renderModeBar(el: HTMLElement, parts: ModeBarPart[]): void;
export function bestStore(key: string): { get(id: string): any; put(id: string, rec: any, better: (a: any, b: any) => boolean): boolean };
