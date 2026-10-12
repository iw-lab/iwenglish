// juice.js(@gb-juice v1)는 정본 그대로 둔 순수 JS라 TS 추론이 일부 옵션(table·sfx·burst·kick)의
// 타입을 못 끌어낸다(기본값 없는 구조분해 파라미터) — 내용을 고치지 않고 타입만 옆에 적는다.
export declare const CHANNELS: string[];
export declare function validateJuiceTable(table: Record<string, string[]>): string[];

export interface JuiceFireOptions {
  x?: number;
  y?: number;
  n?: number;
  text?: string;
  color?: string;
  big?: number;
  sfx?: string;
  vol?: number;
  vib?: number[];
  flashColor?: string;
  flashAlpha?: number;
  slowSec?: number;
  stopSec?: number;
  title?: string;
  bannerSec?: number;
  comboColor?: string;
  punch?: string | string[];
  [extra: string]: unknown;
}

export interface CreateJuiceOptions {
  table: Record<string, readonly string[]>;
  host?: HTMLElement;
  sfx?: (name: string, opts: { rate: number; vol: number }) => void;
  burst?: (opts: JuiceFireOptions & { action: string; mult: number }) => void;
  kick?: (opts: JuiceFireOptions & { action: string; mult: number }) => void;
  punch?: Record<string, string | string[]>;
  haptics?: () => boolean;
  comboWindow?: number;
}

export interface Juice {
  readonly combo: number;
  fire(action: string, opts?: JuiceFireOptions): void;
  time(dt: number): number;
  pop(text: string, x: number, y: number, color?: string, big?: number): void;
  punch(sel: string | Element, big?: number): void;
  flash(color?: string, a?: number): void;
  banner(text: string, color?: string, sec?: number): void;
  destroy(): void;
}

export declare function createJuice(opts: CreateJuiceOptions): Juice;
