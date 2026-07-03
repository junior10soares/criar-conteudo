import { FFMPEG_BIN, run } from "../render";

/** Rhubarb não lê mp3 — converte pra wav mono 16kHz, mais que suficiente pra análise fonética. */
export async function mp3ToWav(mp3Path: string, wavPath: string): Promise<void> {
  await run(FFMPEG_BIN, ["-y", "-i", mp3Path, "-ar", "16000", "-ac", "1", wavPath]);
}
