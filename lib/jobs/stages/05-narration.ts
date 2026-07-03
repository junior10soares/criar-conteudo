import fs from "node:fs/promises";
import path from "node:path";
import { synthesizeNarration, type SubtitleCue } from "../../tts/edgeTts";
import { concatAudio } from "../../video/render";
import { getMediaDurationMs } from "../../video/probe";
import type { ScriptResult } from "../types";

export interface SceneNarration {
  durationMs: number;
  cues: SubtitleCue[];
}

export interface NarrationStageResult {
  combinedAudioPath: string;
  scenes: SceneNarration[];
}

export async function runNarration(
  script: ScriptResult,
  voice: string,
  outDir: string
): Promise<NarrationStageResult> {
  const scenesDir = path.join(outDir, "cenas");
  await fs.mkdir(scenesDir, { recursive: true });

  const scenes: SceneNarration[] = [];
  const audioPaths: string[] = [];

  for (let i = 0; i < script.videoScenes.length; i++) {
    const audioPath = path.join(scenesDir, `narracao-${i + 1}.mp3`);
    const result = await synthesizeNarration(script.videoScenes[i].narration, audioPath, voice);
    // O último cue de palavra não cobre o silêncio/respiração final do áudio real,
    // então a duração da cena (usada para casar imagem de fundo x áudio no vídeo)
    // vem do arquivo mp3 de verdade, não da estimativa por cues.
    const realDurationMs = await getMediaDurationMs(audioPath);
    scenes.push({ durationMs: realDurationMs, cues: result.cues });
    audioPaths.push(audioPath);
  }

  const combinedAudioPath = path.join(outDir, "narracao.mp3");
  await concatAudio(audioPaths, combinedAudioPath);

  return { combinedAudioPath, scenes };
}
