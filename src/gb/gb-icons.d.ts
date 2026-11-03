/** gb-icons.js — 키트 화면 아이콘(선 SVG 문자열). TS 게임이 import 할 때 TS7016(선언 없음)으로 빌드가 막혀 더했다(2026-10-15 보카웜) */
export type GbIconName = 'trophy' | 'ticket' | 'school' | 'play' | 'check' | 'x' | 'timer' | 'heart' | 'sparkle';
/** gbIcon('trophy') → 인라인 SVG 문자열(없는 이름이면 '') · cls 로 크기·색을 CSS 에서 맞춘다(.gb-ic 기본 1.1em) */
export function gbIcon(name: GbIconName | string, cls?: string): string;
