import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * 🔴 무음 실패는 알려야 한다 — '듣고 고르기'는 단어를 화면에 보여주지 않는다.
 * 음원이 죽었는데 조용히 무음으로 두면 아이는 소리도 글자도 없이 4지선다를 찍고,
 * 그 답이 Leitner 박스에 그대로 남는다. playAudioUrl 은 반드시 onError 로 알린다.
 */

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  src: string;
  preload = "";
  playbackRate = 1;
  onplaying: (() => void) | null = null;
  onended: (() => void) | null = null;
  /** play() 를 몇 번째까지 거부할지 */
  static rejectPlays = 0;
  playCalls = 0;
  loadCalls = 0;

  constructor(src?: string) {
    super();
    this.src = src ?? "";
    FakeAudio.instances.push(this);
  }
  play() {
    this.playCalls++;
    return this.playCalls <= FakeAudio.rejectPlays
      ? Promise.reject(new DOMException("no", "NotAllowedError"))
      : Promise.resolve();
  }
  load() {
    this.loadCalls++;
  }
  pause() {}
}

beforeEach(() => {
  FakeAudio.instances = [];
  FakeAudio.rejectPlays = 0;
  vi.stubGlobal("Audio", FakeAudio);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const load = async () => (await import("@/lib/audio")).playAudioUrl;
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("playAudioUrl — 실패 알림", () => {
  it("재시도까지 실패하면 onError 를 부른다", async () => {
    FakeAudio.rejectPlays = 2; // 첫 시도 + 재시도 모두 거부
    const playAudioUrl = await load();
    const onError = vi.fn();

    const a = playAudioUrl("/x.mp3", { onError }) as unknown as FakeAudio;
    await tick();
    a.dispatchEvent(new Event("canplaythrough")); // 재시도 트리거
    await tick();
    await tick();

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("404·네트워크 오류(element error)만 와도 onError 를 부른다", async () => {
    // play() 는 거부하지 않는데 소스가 깨진 경우 — 실제 CDN 유실이 이 모양이다.
    const playAudioUrl = await load();
    const onError = vi.fn();

    const a = playAudioUrl("/x.mp3", { onError }) as unknown as FakeAudio;
    a.dispatchEvent(new Event("error"));
    await tick();

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("첫 시도가 거부돼도 재시도가 성공하면 onError 는 안 부른다", async () => {
    FakeAudio.rejectPlays = 1;
    const playAudioUrl = await load();
    const onError = vi.fn();

    const a = playAudioUrl("/x.mp3", { onError }) as unknown as FakeAudio;
    await tick();
    a.dispatchEvent(new Event("canplaythrough"));
    await tick();
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(a.loadCalls).toBe(1);
  });

  it("실패가 겹쳐 와도 onError 는 한 번만 부른다", async () => {
    const playAudioUrl = await load();
    const onError = vi.fn();

    const a = playAudioUrl("/x.mp3", { onError }) as unknown as FakeAudio;
    a.dispatchEvent(new Event("error"));
    a.dispatchEvent(new Event("error"));
    await tick();

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("정상 재생이면 onError 를 안 부른다", async () => {
    const playAudioUrl = await load();
    const onError = vi.fn();

    playAudioUrl("/x.mp3", { onError });
    await tick();

    expect(onError).not.toHaveBeenCalled();
  });
});
