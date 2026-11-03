// 학교 허브 Durable Object — D1 대신 DO 내장 SQLite(무료 플랜 · 계정 D1 상한과 무관). 인스턴스 하나(idFromName('hub'))가 모든 요청을 차례로 받는다.
// 배선 = wrangler.toml 의 HUB_DO 바인딩 + migrations new_sqlite_classes(키트 hub/wrangler.do.toml.tmpl · install.sh --store do).
import { DurableObject } from 'cloudflare:workers';
import { Hub, doD1 } from './hub.js';

export class HubDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.hub = new Hub({ db: doD1(ctx.storage), secret: env.QUIZ_KEY, free: env.FREE_PLAY === '1', nocap: env.NO_CAP === '1', switchPerDay: env.SCHOOL_SWITCH_PER_DAY });
  }
  /** 워커가 RPC 로 부른다 — 반환 {status, body} 는 구조적 복제로 건너간다 */
  async handle(path, body) { return this.hub.handle(path, body); }
}
