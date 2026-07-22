#!/usr/bin/env python3
"""EchoTale 삽화 보조 엔진 — Meta AI (브라우저 브릿지, 순차 생성).

codex 생성기와 같은 작업 정의를 공유한다(gen-*-images.mjs `dump` 모드가 단일 출처):
  표지(앵커 없음) → 페이지(그 책 표지를 첨부해 캐릭터 고정).
생성물은 같은 경로(public/seed/<slug>/pN.png)에 저장되어 기존 QA·optimize 파이프라인을 그대로 탄다.

실행:
  ~/.claude/venvs/vibes/bin/python -u scripts/meta-image-gen.py            # 전체 결손분
  META_ONLY="slug1 slug2" ...                                              # 특정 책만
  META_DAILY_CAP=150 META_LIMIT=30 ...                                     # 상한 조정
정지: touch scripts/.meta-stop  (현재 장 마무리 후 안전 종료)

설계 원칙(vibes_bridge 계승): 로그인·자격증명 미취급, 워터마크/IPTC 보존, 인간 페이싱.
⚠️ Meta 약관은 자동 접근을 금지 — 계정 제한 리스크는 사용자가 감수함(2026-07-19 사용자 승인).
생성 이력은 scripts/.meta-manifest.json 에 기록(라이선스 서류 대응 — 삽화 출처 구분용).
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit("[에러] playwright 미설치 — ~/.claude/venvs/vibes/bin/python 으로 실행하세요.")

ROOT = Path(__file__).resolve().parent.parent
PROFILE_DIR = Path(os.environ.get("VIBES_PROFILE", Path.home() / ".vibeflow" / "profile"))
META_URL = "https://www.meta.ai/"
MANIFEST = ROOT / "scripts" / ".meta-manifest.json"
USAGE_FILE = Path.home() / ".vibeflow" / "meta-usage.json"
STOP_FILE = ROOT / "scripts" / ".meta-stop"
DAILY_CAP = int(os.environ.get("META_DAILY_CAP", "150"))
RUN_LIMIT = int(os.environ.get("META_LIMIT", "100000"))  # 이번 실행 상한(테스트용)
ONLY = set(os.environ.get("META_ONLY", "").split())
PER_IMAGE_TIMEOUT = 240
PACING_SEC = 14  # 장 사이 간격(인간 페이싱)


def sh(cmd: list[str]) -> str:
    return subprocess.run(cmd, capture_output=True, text=True).stdout


def load_tasks() -> list[dict]:
    tasks = []
    for gen in ("gen-book-images.mjs", "gen-storybook-images.mjs"):
        out = sh(["node", str(ROOT / "scripts" / gen), "dump"])
        line = out.strip().splitlines()[-1] if out.strip() else "[]"
        tasks += json.loads(line)
    return tasks


def missing(t: dict) -> bool:
    out = Path(t["out"])
    return not out.exists() and not out.with_suffix(".webp").exists()


def ensure_anchor_png(anchor: str) -> str | None:
    """앵커 표지 png 확보 — webp만 있으면 변환(restore-cover-anchors 패턴)."""
    a = Path(anchor)
    if a.exists():
        return str(a)
    w = a.with_suffix(".webp")
    if w.exists():
        subprocess.run(["sips", "-s", "format", "png", str(w), "--out", str(a)],
                       capture_output=True)
        if a.exists():
            return str(a)
    return None


def existing_md5s() -> set[str]:
    """기존 전 자산 md5 — 에코·교차오염 검출용 대조군 (codex 생성기와 동일 방어)."""
    s: set[str] = set()
    pub = ROOT / "public" / "seed"
    if not pub.exists():
        return s
    for f in pub.rglob("*"):
        if f.suffix.lower() in (".png", ".webp") and f.is_file():
            try:
                s.add(hashlib.md5(f.read_bytes()).hexdigest())
            except Exception:
                pass
    return s


def usage_today() -> int:
    today = time.strftime("%Y-%m-%d")
    try:
        return json.loads(USAGE_FILE.read_text()).get(today, 0)
    except Exception:
        return 0


def usage_bump() -> int:
    today = time.strftime("%Y-%m-%d")
    try:
        d = json.loads(USAGE_FILE.read_text())
    except Exception:
        d = {}
    d[today] = d.get(today, 0) + 1
    USAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    USAGE_FILE.write_text(json.dumps(d))
    return d[today]


def manifest_add(entry: dict):
    try:
        m = json.loads(MANIFEST.read_text())
    except Exception:
        m = []
    m.append(entry)
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=1))


def dismiss_dialog(page):
    try:
        dlg = page.query_selector("[role=dialog][data-state=open]")
        if not dlg:
            return
        for txt in ("삭제", "확인", "Delete", "Discard", "Confirm", "Continue"):
            b = dlg.query_selector(f"button:has-text('{txt}')")
            if b:
                b.click(); time.sleep(1); return
        bs = dlg.query_selector_all("button")
        if bs:
            bs[-1].click(); time.sleep(1)
    except Exception:
        pass


def find_box(page):
    for sel in ("[contenteditable=true]", "[role=textbox]"):
        for el in page.query_selector_all(sel):
            try:
                if el.is_visible() and el.is_editable():
                    return el
            except Exception:
                continue
    return None


def attach_ref(page, ref: str) -> bool:
    """레퍼런스 첨부 + 칩 표시 검증 (v2 실측 사고: chooser 성공≠실제 첨부)."""
    def chip():
        for sel in ("[aria-label*='Remove']", "[aria-label*='제거']", "form img",
                    "[contenteditable=true] img", "[data-testid*='attachment']"):
            try:
                el = page.query_selector(sel)
                if el and el.is_visible():
                    return True
            except Exception:
                pass
        return False

    att = page.query_selector("[aria-label='Add attachment'], button:has-text('Add attachment')")
    if att:
        try:
            with page.expect_file_chooser(timeout=4000) as fc:
                att.click()
            fc.value.set_files(ref)
        except Exception:
            pass
    time.sleep(3)
    if not chip():
        fi = page.query_selector("input[type=file]")
        if fi:
            try:
                fi.set_input_files(ref); time.sleep(3)
            except Exception:
                pass
    return chip()


def composer_len(page) -> int:
    bx = find_box(page)
    try:
        return len((bx.inner_text() or "").strip()) if bx else 0
    except Exception:
        return 0


def submit(page) -> bool:
    """제출 성공(컴포저 비워짐)까지 여러 방식 반복 — 업로드 중 Send 비활성화 대응.

    실측 사고 이력: Enter는 이 컴포저에서 줄바꿈(v2), Send 버튼도 첨부 업로드가
    끝나기 전엔 비활성이라 클릭이 무시됨(파일럿 p1 hang).
    """
    for attempt in range(8):
        # ① Send 계열 버튼
        for sel in ("[aria-label='Send']", "button:has-text('Send')",
                    "[aria-label='보내기']", "[aria-label*='메시지 보내기']",
                    "[aria-label*='Send message']", "button[type=submit]"):
            try:
                b = page.query_selector(sel)
                if b and b.is_visible() and b.is_enabled():
                    b.click(); break
            except Exception:
                continue
        time.sleep(2.5)
        if composer_len(page) < 40:
            return True
        # ② 키보드 폴백
        bx = find_box(page)
        if bx:
            try:
                bx.click()
            except Exception:
                pass
        page.keyboard.press("Enter")
        time.sleep(2)
        if composer_len(page) < 40:
            return True
        page.keyboard.press("Meta+Enter")
        time.sleep(2)
        if composer_len(page) < 40:
            return True
        time.sleep(3)  # 첨부 업로드 진행 중일 수 있음 — 조금 기다렸다 재시도
    return composer_len(page) < 40


def gen_one(ctx, page, task: dict, known: set[str]) -> bool:
    anchor = task.get("anchor")
    ref = ensure_anchor_png(anchor) if anchor else None
    if anchor and not ref:
        print(f"  ⏭ {task['label']} — 앵커 표지 없음(표지 먼저)", flush=True)
        return False

    net: list[dict] = []
    mark = {"t": 0.0}
    ref_md5 = hashlib.md5(Path(ref).read_bytes()).hexdigest() if ref else None

    def on_response(resp):
        try:
            if "image/" not in (resp.headers or {}).get("content-type", ""):
                return
            if not (mark["t"] and time.time() > mark["t"] + 4):
                return
            body = resp.body()
            if not body or len(body) < 150_000:
                return
            h = hashlib.md5(body).hexdigest()
            if h == ref_md5 or h in known:
                return  # 업로드 에코·기존 자산 배제
            net.append({"url": resp.url.split("?")[0], "bytes": body, "md5": h,
                        "size": len(body), "at": time.time()})
        except Exception:
            pass

    page.on("response", on_response)
    try:
        page.goto(META_URL, wait_until="domcontentloaded", timeout=60000)
        time.sleep(5)
        dismiss_dialog(page)

        body_txt = page.inner_text("body")[:2000]
        if any(t in body_txt for t in ("로그인", "Log in", "Sign up", "가입하기")):
            print("❌ 로그인 풀림 — vibes_bridge.py --login 후 재실행", flush=True)
            raise SystemExit(3)

        box = find_box(page)
        if not box:
            print(f"  ❌ {task['label']} 입력창 미발견", flush=True)
            return False
        box.click(); time.sleep(1); dismiss_dialog(page)

        if ref:
            if not attach_ref(page, ref):
                print(f"  ❌ {task['label']} 첨부 실패", flush=True)
                return False
            lead = ("Generate an image based on the attached reference illustration "
                    "(this book's cover). Keep every recurring character's face, hair, fur, "
                    "colors and outfit IDENTICAL to the reference — zero drift. Do NOT add "
                    "clothing or accessories that are not in the reference. ")
        else:
            lead = "Generate an image. "
        # codex 관리 라벨([slug · pN · salt])을 Meta는 그림 속 글자로 그림 — 제거 (p3 실측 사고)
        prompt_body = "\n".join(
            ln for ln in task["prompt"].splitlines() if not ln.strip().startswith("[")
        )
        tail = (" Absolutely NO text, letters, captions, watermarks, borders or frames "
                "anywhere in the image.")

        box = find_box(page) or box
        box.click(); time.sleep(0.6)
        page.keyboard.type(lead + prompt_body + tail, delay=8)
        time.sleep(1.5)
        mark["t"] = time.time()
        if not submit(page):
            print(f"  ❌ {task['label']} 제출 실패(컴포저 잔류)", flush=True)
            return False

        got = None
        deadline = time.time() + PER_IMAGE_TIMEOUT
        while time.time() < deadline:
            time.sleep(4)
            if net and time.time() - net[-1]["at"] > 10:
                got = max(net, key=lambda h: h["size"]); break
            try:
                for im in page.query_selector_all("img"):
                    src = im.get_attribute("src") or ""
                    if not src.startswith("http"):
                        continue
                    try:
                        w = im.evaluate("e => e.naturalWidth")
                    except Exception:
                        w = 0
                    if w and w >= 700:
                        r = ctx.request.get(src, timeout=60000)
                        body = r.body()
                        h = hashlib.md5(body or b"").hexdigest()
                        if body and len(body) > 150_000 and h != ref_md5 and h not in known:
                            got = {"url": src.split("?")[0], "bytes": body, "md5": h,
                                   "size": len(body)}
                            break
                if got:
                    break
            except Exception:
                pass

        if not got:
            print(f"  ⏱ {task['label']} 미수신", flush=True)
            return False

        # 수신 포맷 무관하게 png 로 정규화 저장 (파이프라인 계약: pN.png / cover.png)
        tmp = Path(task["out"]).with_suffix(".meta-tmp")
        tmp.write_bytes(got["bytes"])
        subprocess.run(["sips", "-s", "format", "png", str(tmp), "--out", task["out"]],
                       capture_output=True)
        tmp.unlink(missing_ok=True)
        if not Path(task["out"]).exists():
            print(f"  ❌ {task['label']} png 변환 실패", flush=True)
            return False
        known.add(got["md5"])
        n = usage_bump()
        manifest_add({"file": task["out"].replace(str(ROOT) + "/", ""),
                      "engine": "meta-ai", "ts": time.strftime("%Y-%m-%d %H:%M")})
        print(f"  ✅ {task['label']} ({got['size']//1024}KB · 오늘 {n}/{DAILY_CAP})", flush=True)
        return True
    finally:
        try:
            page.remove_listener("response", on_response)
        except Exception:
            pass


def main() -> int:
    STOP_FILE.unlink(missing_ok=True)
    tasks = [t for t in load_tasks() if missing(t)]
    if ONLY:
        tasks = [t for t in tasks if any(t["label"].startswith(s + " ") for s in ONLY)]
    # 책 단위 그룹: 표지 먼저 → 그 책 페이지 (앵커 확보 순서)
    tasks.sort(key=lambda t: (t["dir"], 0 if t["label"].endswith("cover") else 1, t["label"]))
    print(f"🖼️ Meta 엔진 — 결손 {len(tasks)}장 (오늘 사용 {usage_today()}/{DAILY_CAP})", flush=True)
    if not tasks:
        print("결손 없음 — 종료"); return 0

    done = fail = 0
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR), headless=False,
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        known = existing_md5s()
        print(f"  대조군 {len(known)}장 (에코·오염 방어)", flush=True)

        for t in tasks:
            if STOP_FILE.exists():
                print("🛑 stop 파일 감지 — 안전 종료", flush=True); break
            if usage_today() >= DAILY_CAP:
                print(f"⛔ 일일 상한 {DAILY_CAP} 도달 — 내일 재개", flush=True); break
            if done >= RUN_LIMIT:
                print(f"⏹ 실행 상한 {RUN_LIMIT} 도달", flush=True); break
            if not missing(t):
                continue  # 병행 작업이 채웠으면 skip
            print(f"[{done + fail + 1}/{len(tasks)}] {t['label']}", flush=True)
            try:
                ok = gen_one(ctx, page, t, known)
            except SystemExit:
                raise
            except Exception as e:
                print(f"  ⚠️ 예외: {e}", flush=True)
                ok = False
            done += ok
            fail += (not ok)
            time.sleep(PACING_SEC)
        ctx.close()
    print(f"\n=== META_ENGINE_DONE 생성 {done} · 실패 {fail} ===", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
