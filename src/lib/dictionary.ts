/** dictionaryapi.dev (무료, 키 불필요) — IPA·오디오·품사·예문 */

export interface DictEntry {
  ipa: string;
  pos: string;
  audioUrl: string;
  example_en: string;
  definition_en: string;
}

interface ApiPhonetic {
  text?: string;
  audio?: string;
}
interface ApiDefinition {
  definition?: string;
  example?: string;
}
interface ApiMeaning {
  partOfSpeech?: string;
  definitions?: ApiDefinition[];
}
interface ApiEntry {
  phonetic?: string;
  phonetics?: ApiPhonetic[];
  meanings?: ApiMeaning[];
}

export async function lookupDictionary(
  word: string,
): Promise<DictEntry | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { next: { revalidate: 60 * 60 * 24 * 30 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as ApiEntry[];
    const entry = data?.[0];
    if (!entry) return null;

    const ipa =
      entry.phonetic ||
      entry.phonetics?.find((p) => p.text)?.text ||
      "";
    const audioUrl =
      entry.phonetics?.find((p) => p.audio)?.audio?.replace(/^\/\//, "https://") ||
      "";
    const meaning = entry.meanings?.[0];
    const pos = meaning?.partOfSpeech ?? "";
    const def = meaning?.definitions?.find((d) => d.definition);
    return {
      ipa,
      pos,
      audioUrl,
      example_en: def?.example ?? "",
      definition_en: def?.definition ?? "",
    };
  } catch {
    return null;
  }
}
