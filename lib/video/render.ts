import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

export const run = promisify(execFile);

if (!ffmpegPath) {
  throw new Error("ffmpeg-static não encontrou o binário do ffmpeg para esta plataforma.");
}
export const FFMPEG_BIN: string = ffmpegPath;

/** Concatenates same-codec mp3 files (no re-encode) into a single track. */
export async function concatAudio(audioPaths: string[], outPath: string): Promise<void> {
  const listPath = `${outPath}.filelist.txt`;
  const listContent = audioPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(listPath, listContent, "utf-8");

  try {
    await run(FFMPEG_BIN, ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath], {
      maxBuffer: 1024 * 1024 * 32,
    });
  } finally {
    await unlink(listPath).catch(() => {});
  }
}

function escapeFfmpegFilterPath(p: string): string {
  return p.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export interface VideoScene {
  imagePath: string;
  durationSec: number;
}

export const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

/** Renders one scene's Ken-Burns clip, hard-trimmed to exactly `durationSec` (silent, no audio). */
async function renderSceneClip(scene: VideoScene, outPath: string): Promise<void> {
  const frames = Math.max(1, Math.round(scene.durationSec * FPS * 1.05));
  const args = [
    "-y",
    "-loop",
    "1",
    "-i",
    scene.imagePath,
    "-vf",
    `scale=2560:-2,zoompan=z='min(zoom+0.0006,1.25)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS}`,
    "-t",
    String(scene.durationSec),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    outPath,
  ];
  await run(FFMPEG_BIN, args, { maxBuffer: 1024 * 1024 * 32 });
}

/** Renders a multi-scene Ken-Burns video (one background per scene) with burned-in captions from an .ass file. */
export async function renderSceneVideo(
  scenes: VideoScene[],
  audioPath: string,
  assPath: string,
  fontsDir: string,
  outPath: string
): Promise<void> {
  const tmpDir = await mkdtemp(path.join(tmpdir(), "cc-video-"));

  try {
    const clipPaths: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const clipPath = path.join(tmpDir, `clip-${i}.mp4`);
      await renderSceneClip(scenes[i], clipPath);
      clipPaths.push(clipPath);
    }

    const silentVideoPath = path.join(tmpDir, "silent.mp4");
    const listPath = path.join(tmpDir, "clips.txt");
    await writeFile(listPath, clipPaths.map((p) => `file '${p}'`).join("\n"), "utf-8");
    await run(
      FFMPEG_BIN,
      ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", silentVideoPath],
      { maxBuffer: 1024 * 1024 * 32 }
    );

    await run(
      FFMPEG_BIN,
      [
        "-y",
        "-i",
        silentVideoPath,
        "-i",
        audioPath,
        "-vf",
        `subtitles=${escapeFfmpegFilterPath(assPath)}:fontsdir=${escapeFfmpegFilterPath(fontsDir)}`,
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        outPath,
      ],
      { maxBuffer: 1024 * 1024 * 64 }
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export const FONTS_DIR = path.join(process.cwd(), "assets", "fonts");

const AVATAR_CHROMA_KEY = "0x00FF00";

/** Overlays a flat-green-background avatar clip (chroma-keyed) in the bottom-right corner of an
 *  existing video, above the burned-caption band (MarginV: 220 in captions.ts). Writes to `outPath`
 *  — never mutates `baseVideoPath` in place, so the caller can atomically swap it in on success. */
export async function compositeAvatarOverlay(
  baseVideoPath: string,
  avatarClipPath: string,
  outPath: string
): Promise<void> {
  const overlaySize = Math.round(WIDTH * 0.28);
  const margin = 24;
  const x = WIDTH - overlaySize - margin;
  const y = HEIGHT - overlaySize - margin - 240;

  const filterComplex =
    `[1:v]scale=${overlaySize}:${overlaySize},format=yuva420p,` +
    `colorkey=${AVATAR_CHROMA_KEY}:0.30:0.15[avatar];` +
    `[0:v][avatar]overlay=${x}:${y}[outv]`;

  await run(
    FFMPEG_BIN,
    [
      "-y",
      "-i",
      baseVideoPath,
      "-i",
      avatarClipPath,
      "-filter_complex",
      filterComplex,
      "-map",
      "[outv]",
      "-map",
      "0:a",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "copy",
      outPath,
    ],
    { maxBuffer: 1024 * 1024 * 64 }
  );
}
