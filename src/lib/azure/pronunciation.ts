import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { requireServerEnv } from "@/lib/env";

export interface PronunciationScores {
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody: number;
  overall: number;
  words: { word: string; accuracy: number }[];
}

/**
 * Azure Pronunciation Assessment (서버, 16kHz/16bit/mono PCM WAV 입력 기대).
 * 브라우저 권장 경로는 client SDK + /api/azure-token 이지만, 서버 평가도 지원.
 */
export function assessPronunciation(
  wavPcm: Buffer,
  referenceText: string,
): Promise<PronunciationScores> {
  const key = requireServerEnv("azureSpeechKey");
  const region = requireServerEnv("azureSpeechRegion");

  const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
  const pushStream = sdk.AudioInputStream.createPushStream(format);
  pushStream.write(
    wavPcm.buffer.slice(
      wavPcm.byteOffset,
      wavPcm.byteOffset + wavPcm.byteLength,
    ) as ArrayBuffer,
  );
  pushStream.close();

  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechRecognitionLanguage = "en-US";

  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  const pa = new sdk.PronunciationAssessmentConfig(
    referenceText,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    true,
  );
  pa.enableProsodyAssessment = true;
  pa.applyTo(recognizer);

  return new Promise<PronunciationScores>((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      (result) => {
        try {
          const r = sdk.PronunciationAssessmentResult.fromResult(result);
          const words =
            r.detailResult?.Words?.map((w) => ({
              word: w.Word,
              accuracy: w.PronunciationAssessment?.AccuracyScore ?? 0,
            })) ?? [];
          resolve({
            accuracy: r.accuracyScore,
            fluency: r.fluencyScore,
            completeness: r.completenessScore,
            prosody: r.prosodyScore ?? 0,
            overall: r.pronunciationScore,
            words,
          });
        } catch (e) {
          reject(e);
        } finally {
          recognizer.close();
        }
      },
      (err) => {
        recognizer.close();
        reject(new Error(String(err)));
      },
    );
  });
}
