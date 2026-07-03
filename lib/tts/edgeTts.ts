import { EdgeTTS } from "node-edge-tts";
import fs from "node:fs/promises";

export interface SubtitleCue {
  part: string;
  start: number;
  end: number;
}

export interface NarrationResult {
  audioPath: string;
  durationMs: number;
  cues: SubtitleCue[];
}

/** Synthesizes `text` as speech via Microsoft Edge's free TTS voices, writing an mp3 + word-timing JSON. */
export async function synthesizeNarration(
  text: string,
  audioPath: string,
  voice: string
): Promise<NarrationResult> {
  const tts = new EdgeTTS({ voice, lang: "pt-BR", saveSubtitles: true, timeout: 30_000 });
  await tts.ttsPromise(text, audioPath);

  const cues: SubtitleCue[] = JSON.parse(await fs.readFile(`${audioPath}.json`, "utf-8"));
  const durationMs = cues.length ? cues[cues.length - 1].end : 0;
  return { audioPath, durationMs, cues };
}
