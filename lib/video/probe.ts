import { execFile } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

if (!ffmpegPath) {
  throw new Error("ffmpeg-static não encontrou o binário do ffmpeg para esta plataforma.");
}
const FFMPEG_BIN: string = ffmpegPath;

/** Real duration of a media file in ms, read from ffmpeg's own stderr report (no ffprobe bundled). */
export function getMediaDurationMs(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile(FFMPEG_BIN, ["-i", filePath, "-f", "null", "-"], (_err, _stdout, stderr) => {
      const match = stderr.match(/Duration: (\d+):(\d{2}):(\d{2})\.(\d{2})/);
      if (!match) {
        reject(new Error(`Não consegui ler a duração de ${filePath}`));
        return;
      }
      const [, h, m, s, cs] = match;
      resolve(
        (Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000 + Number(cs) * 10
      );
    });
  });
}
