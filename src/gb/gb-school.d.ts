export function configureSchool(o: { freePlay?: boolean; playWord?: string; quizSubject?: "math" | "eng" | "music"; sfx?: { tick?: () => void; win?: () => void } | null }): void;
export function mountSchoolRank(el: HTMLElement): void;
export function refreshSchoolRank(): Promise<void>;
export function openSchool(then?: (() => void) | null): void;
export function openRankAll(which?: 'd' | 'w'): void;
export function openQuiz(then?: (() => void) | null, why?: string): void;
export function shortSchool(n: string): string;
export interface GbResult { ok: boolean; added: number; school: string | null; capped?: boolean }
export function gbGate(go: (ref: string | null) => void, o?: { kind?: string; chain?: boolean }): Promise<void>;
export function gbFinish(ref: string | null, cleared: boolean): Promise<GbResult | null>;
export function gbLeave(ref: string | null): Promise<GbResult | null>;
export const SITE_LINK: string;
export function mountSiteLink(host: HTMLElement | null, auto?: boolean): HTMLAnchorElement | null;
