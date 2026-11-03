export interface HubSchool { code: string; name: string; sido: string; region?: string }
export interface HubState { online: boolean | null; checkedAt: number; free: boolean; tix: number; school: HubSchool | null; todayPts: number; cap: number; pass: number; q: number; per: number }
export const hubState: HubState;
export function configureHub(o: { key?: string; base?: string; direct?: string; timeoutMs?: number; offline?: boolean }): void;
export function hubKey(suffix: string): string;
export function hubLoad(): Record<string, any>;
export function hubSave(patch: Record<string, any>): void;
export function onHub(f: (s: HubState) => void): () => void;
export function refreshMe(): Promise<HubState>;
export function searchSchool(q: string, sido?: string): Promise<any>;
export function selectSchool(code: string, sido: string): Promise<any>;
export function topSchools(): Promise<any>;
export function newPack(subject: string, grade: number): Promise<any>;
export function gradePack(pid: string, answers: number[]): Promise<any>;
export function newRef(kind?: string): string;
export function spendTicket(ref: string, kind?: string): Promise<any>;
export function refundTicket(ref: string): Promise<any>;
export function reportResult(ref: string, cleared: boolean): Promise<any>;
