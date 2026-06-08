import sys, json
from faster_whisper import WhisperModel

# 한 번 로드해서 여러 파일 처리 (stdin 으로 경로 줄단위 입력)
model = WhisperModel("tiny.en", device="cpu", compute_type="int8")

def align(path):
    segments, _ = model.transcribe(path, word_timestamps=True, language="en")
    words = []
    for seg in segments:
        for w in (seg.words or []):
            words.append({
                "word": w.word.strip(),
                "startMs": round(w.start * 1000),
                "endMs": round(w.end * 1000),
            })
    return words

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(json.dumps(align(sys.argv[1])))
    else:
        for line in sys.stdin:
            p = line.strip()
            if p:
                print(json.dumps({"path": p, "words": align(p)}), flush=True)
