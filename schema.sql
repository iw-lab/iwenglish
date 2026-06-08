-- EchoTale D1 스키마
-- 동기화 코드(sync_id)별로 진도/단어장 등을 key-value(JSON) 로 저장.
-- 적용: wrangler d1 execute echotale-db --file=./schema.sql  (로컬은 --local)

CREATE TABLE IF NOT EXISTS sync_store (
  sync_id    TEXT NOT NULL,
  key        TEXT NOT NULL,            -- 'progress' | 'wordbook' | ...
  value      TEXT NOT NULL,            -- JSON 문자열
  updated_at INTEGER NOT NULL,         -- epoch ms
  PRIMARY KEY (sync_id, key)
);

CREATE INDEX IF NOT EXISTS idx_sync_updated ON sync_store (sync_id, updated_at);
