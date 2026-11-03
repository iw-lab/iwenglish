export const SSAM_HOSTS: string[];
export const SSAM_DOOR: string;
export function ssamPass(loc?: Location, ref?: string, store?: Storage): boolean;
export function ssamDoorUrl(loc?: Location): string;
export function showRoomLock(what?: string): HTMLElement;
export function guardRoom<T extends (...a: any[]) => any>(fn: T, what?: string): (...a: Parameters<T>) => ReturnType<T> | undefined;
