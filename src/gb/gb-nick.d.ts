export const NICK_ADJ: string[];
export const NICK_NOUN: string[];
export function joinNick(a: string, n: string): string;
export function splitNick(v: string, adj?: string[], noun?: string[]): { a: string; n: string };
export interface NickOpts { adj?: string[]; noun?: string[]; join?: (a: string, n: string) => string; split?: (v: string) => { a: string; n: string }; value?: string; key?: string; title?: string }
export function nickOk(v: string, opts?: NickOpts): boolean;
export function loadNick(key?: string): string;
export function saveNick(v: string, key?: string): void;
export function nickPickerEl(opts?: NickOpts & { onChange?: (v: string) => void }): HTMLElement;
export function openNickPicker(opts?: NickOpts): Promise<string | null>;
export function ensureNick(opts?: NickOpts): Promise<string>;
