#!/usr/bin/env python3
"""녹화본 + 나레이션 + 앱 실제 소리 + 자막 → 제출용 mp4.

  python3 scripts/demo-video/assemble.py <recDir> <narrationDir> <out.mp4>

설계 메모
- 화면 녹화(recordVideo)에는 소리가 없다. 대신 녹화 중 재생된 mp3 와 그 시각을
  세그먼트 json 에 남겨 두었으므로, 같은 파일을 같은 위치에 얹어 소리를 복원한다.
- 앱 소리는 나레이션이 나올 때 자동으로 눌려야 한다(sidechaincompress).
  고정 볼륨으로 깔면 나레이션 구간에선 시끄럽고, 나레이션이 없는 구간에선 너무 작다.
- 자막은 무음으로 보는 심사위원 대비 필수. TTS 는 말 속도가 일정하므로
  문장별 글자 수에 비례해 시간을 나누면 실측 없이도 충분히 맞는다.
"""
import json
import pathlib
import re
import subprocess
import sys

REC = pathlib.Path(sys.argv[1]).resolve()
NAR = pathlib.Path(sys.argv[2]).resolve()
OUT = pathlib.Path(sys.argv[3]).resolve()
SEED = pathlib.Path("public/seed").resolve()

# 세그먼트 순서와, 그 위에 얹을 나레이션 (파일, 세그먼트 시작 기준 오프셋 초)
PLAN = [
    ("intro", [("s1_problem", 0.6)]),
    ("library", [("s2_library", 1.0)]),
    ("shadow", [("s3_shadowing", 1.0)]),
    # 막히는 순간과 도장이 열리는 순간 사이에 실제 청취 20여 초가 있다 → 둘로 나눠 얹는다
    ("cheat", [("s4a_blocked", 0.5), ("s4b_unlocked", 29.0)]),
    ("words", [("s5_words", 1.0)]),
    ("report", [("s6_report", 0.8)]),
    ("outro", [("s7_oss", 0.8)]),
]


def probe(p: pathlib.Path) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True, check=True,
    )
    return float(r.stdout.strip())


def ts(t: float) -> str:
    """ASS 시간 표기 h:mm:ss.cc"""
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def main() -> None:
    # ── 1. 세그먼트 오프셋 실측 ──
    offsets, t = {}, 0.0
    for name, _ in PLAN:
        v = REC / "raw" / f"{name}.webm"
        if not v.exists():
            sys.exit(f"녹화본 없음: {v}")
        offsets[name] = t
        t += probe(v)
    total = t
    print(f"영상 총 길이 {total:.1f}s = {int(total//60)}:{total%60:04.1f}")
    if total > 180:
        print("⚠️ 3분 초과 — 대회 규정 위반")

    # ── 2. 영상 이어붙이기 ──
    lst = REC / "concat.txt"
    lst.write_text("".join(f"file '{REC / 'raw' / (n + '.webm')}'\n" for n, _ in PLAN))
    silent = REC / "video.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
         "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
         "-pix_fmt", "yuv420p", "-r", "25", str(silent)],
        check=True,
    )

    # ── 3. 오디오 트랙 두 개(나레이션 / 앱 소리) 구성 ──
    inputs, nar_parts, app_parts = [], [], []

    def add(path: pathlib.Path, delay_s: float, bucket: list, gain: float = 1.0):
        idx = len(inputs)
        inputs.append(str(path))
        ms = max(0, int(delay_s * 1000))
        bucket.append(f"[{idx}:a]volume={gain},adelay={ms}|{ms}[a{idx}]")
        return f"[a{idx}]"

    nar_labels, app_labels = [], []
    subs = []  # (start, end, text)

    for name, narrations in PLAN:
        base = offsets[name]
        for nfile, off in narrations:
            mp3 = NAR / f"{nfile}.mp3"
            if not mp3.exists():
                sys.exit(f"나레이션 없음: {mp3}")
            start = base + off
            nar_labels.append(add(mp3, start, nar_parts))
            # 자막 — 문장별 글자 수에 비례 배분
            text = TEXTS[nfile]
            dur = probe(mp3)
            sents = [s.strip() for s in re.split(r"(?<=[.?!])\s+", text) if s.strip()]
            chars = sum(len(s) for s in sents) or 1
            cur = start
            for s in sents:
                d = dur * len(s) / chars
                subs.append((cur, cur + d, s))
                cur += d

        meta = REC / f"{name}.json"
        if meta.exists():
            for ev in json.loads(meta.read_text())["audio"]:
                f = SEED / ev["file"]
                if f.exists():
                    app_labels.append(add(f, base + ev["at"], app_parts, gain=1.0))

    fc = nar_parts + app_parts
    if len(nar_labels) > 1:
        fc.append("".join(nar_labels) + f"amix=inputs={len(nar_labels)}:normalize=0[nar]")
    else:
        fc.append(f"{nar_labels[0]}anull[nar]")
    if app_labels:
        fc.append(
            "".join(app_labels)
            + f"amix=inputs={len(app_labels)}:normalize=0,volume=0.85[appraw]"
        )
        # 나레이션을 사이드체인으로 써서 앱 소리를 자동으로 눌러 준다
        fc.append("[nar]asplit=2[nar1][narsc]")
        fc.append(
            "[appraw][narsc]sidechaincompress=threshold=0.02:ratio=12:attack=15:release=350[appduck]"
        )
        fc.append("[appduck][nar1]amix=inputs=2:normalize=0[premix]")
    else:
        fc.append("[nar]anull[premix]")
    # TTS 원본이 평균 -31 dB 로 작다. 유튜브는 -14 LUFS 근처로 맞추므로
    # 그대로 올리면 심사위원이 볼륨을 끝까지 올려야 한다.
    fc.append("[premix]loudnorm=I=-15:TP=-1.5:LRA=11,alimiter=limit=0.97[mix]")

    audio = REC / "audio.m4a"
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for i in inputs:
        cmd += ["-i", i]
    cmd += ["-filter_complex", ";".join(fc), "-map", "[mix]",
            "-t", f"{total:.3f}", "-c:a", "aac", "-b:a", "192k", str(audio)]
    subprocess.run(cmd, check=True)

    # ── 4. 자막(ASS) ──
    ass = REC / "subs.ass"
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Apple SD Gothic Neo,29,&H00FFFFFF,&H000000FF,&H00000000,&HA0000000,1,0,0,0,100,100,0,0,3,5,0,2,70,70,26,1
Style: Note,Apple SD Gothic Neo,19,&H00F0F0F0,&H000000FF,&H00000000,&HB0000000,0,0,0,0,100,100,0,0,3,4,0,9,40,22,14,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [
        f"Dialogue: 0,{ts(a)},{ts(b)},Sub,,0,0,0,,{txt}"
        for a, b, txt in subs
    ]
    # 보호자 리포트는 시연용 샘플 기록이라는 사실을 화면에 밝힌다
    r0 = offsets["report"]
    lines.append(
        f"Dialogue: 0,{ts(r0 + 1.0)},{ts(r0 + probe(REC / 'raw' / 'report.webm'))},"
        "Note,,0,0,0,,※ 이 화면의 기록은 시연용 샘플 데이터입니다"
    )
    ass.write_text(head + "\n".join(lines) + "\n")

    # ── 5. 먹싱 + 자막 태우기 ──
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(silent), "-i", str(audio),
         "-vf", f"subtitles={ass}:fontsdir=/System/Library/Fonts",
         "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "copy", "-movflags", "+faststart", str(OUT)],
        check=True,
    )
    print(f"완성: {OUT}  ({probe(OUT):.1f}s, {OUT.stat().st_size / 1e6:.1f}MB)")


# 자막 원문 — narration.py 의 SEGMENTS 와 같은 문장이어야 한다
TEXTS = {
    "s1_problem": "초등 영어 시간, 교사 한 명이 서른 명의 발음을 봐줘야 합니다. 아이마다 수준이 다른데 일대일로 봐주는 건 불가능합니다. 그리고 대부분의 학습 앱은, 재생 버튼만 눌러도 완료가 됩니다.",
    "s2_library": "에코테일은, 학습이 실제로 일어났을 때만 기록이 쌓이는 영어 낭독 앱입니다. AI로 만든 삼백쉰두 권을 계정도, 로그인도, 비용도 없이 바로 씁니다.",
    "s3_shadowing": "따라 읽기라고 하면 보통 오디오를 두 번 틀어 줍니다. 저희는 다릅니다. 원어민이 말하는 도중에, 한 박자 뒤에서 겹쳐 말하게 합니다. 노란 칸이 원어민이고, 그 뒤를 따라오는 주황 글씨가 아이 차례입니다. 단계가 올라갈수록 원어민 목소리는 작아지고, 마지막 단계에서는 글자까지 가립니다.",
    "s4a_blocked": "그런데 아이가 듣지 않고 넘기면 어떻게 될까요. 재생하지 않고 마지막 쪽까지 넘겨 보겠습니다. 도장 버튼이 없습니다. 대신 아직 안 들은 문장이 몇 개인지 알려 줍니다.",
    "s4b_unlocked": "문장을 끝까지 들은 것만 인정합니다. 다 듣고 나서야 도장이 열립니다. 건너뛰면 아무 기록도 쌓이지 않기 때문에, 이 앱의 학습 기록은 믿을 수 있는 숫자입니다.",
    # ⚠️ 이전 원고 "'알아요' 버튼을 없앴습니다" 는 틀린 표현이었다. 그런 버튼은 이 앱에
    #    있었던 적이 없다(전체 히스토리 확인) — 다른 단어 앱의 자가신고 방식을 안 썼다는 뜻이다.
    "s5_words": "보통 단어 앱은 아는지 모르는지를 아이가 스스로 눌러 보고합니다. 에코테일에는 그 버튼이 없습니다. 천 단어에서 다섯 가지 유형의 문제를 자동으로 만들고, 틀리면 뜻과 예문을 그 자리에서 보여 줍니다. 찍어서 맞힌 것은 점수로 세지 않습니다.",
    "s6_report": "그래서 부모님께 이렇게 말할 수 있습니다. 이번 주 며칠 학습했고, 끝까지 읽은 책이 몇 권, 따라 말한 문장이 몇 개입니다. 검증된 데이터라서 쓸 수 있는 문장입니다.",
    "s7_oss": "전 과정을 MIT 라이선스로 공개했습니다. 콘텐츠 생성 파이프라인까지 들어 있어서, 다른 교실이 자기 교재로 그대로 다시 만들 수 있습니다.",
}

if __name__ == "__main__":
    main()
