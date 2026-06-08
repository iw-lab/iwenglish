import asyncio, sys, json
import edge_tts

async def main():
    voice = sys.argv[1]
    out = sys.argv[2]
    text = sys.stdin.read().strip()
    comm = edge_tts.Communicate(text, voice)
    words = []
    with open(out, "wb") as f:
        async for chunk in comm.stream():
            t = chunk["type"]
            if t == "audio":
                f.write(chunk["data"])
            elif t == "WordBoundary":
                words.append({
                    "text": chunk["text"],
                    "startMs": round(chunk["offset"] / 10000),
                    "endMs": round((chunk["offset"] + chunk["duration"]) / 10000),
                })
    sys.stdout.write(json.dumps(words))

asyncio.run(main())
