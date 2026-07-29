-- EchoTale D1 스키마
--
-- ⚠️ 현재 미사용 — 앱 코드에서 이 테이블을 읽거나 쓰는 경로는 없습니다.
--    EchoTale 은 계정 없이 동작하며 모든 학습 기록을 기기의 localStorage 에만
--    저장하고 서버로 전송하지 않습니다. 아래 스키마는 "기기간 동기화"를 선택
--    기능으로 붙일 때를 위한 예약이며, 로드맵 항목입니다.
--    (wrangler.jsonc 의 DB 바인딩도 같은 이유로 예약 상태입니다.)
--
-- 동기화 코드(sync_id)별로 진도/단어장 등을 key-value(JSON) 로 저장하는 설계.
-- 적용: wrangler d1 execute echotale-db --file=./schema.sql  (로컬은 --local)

CREATE TABLE IF NOT EXISTS sync_store (
  sync_id    TEXT NOT NULL,
  key        TEXT NOT NULL,            -- 'progress' | 'wordbook' | ...
  value      TEXT NOT NULL,            -- JSON 문자열
  updated_at INTEGER NOT NULL,         -- epoch ms
  PRIMARY KEY (sync_id, key)
);

CREATE INDEX IF NOT EXISTS idx_sync_updated ON sync_store (sync_id, updated_at);
