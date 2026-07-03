import fs from "node:fs/promises";
import path from "node:path";
import { renderSceneVideo, FONTS_DIR, type VideoScene } from "../../video/render";
import { buildAssContent, type SceneCues } from "../../video/captions";
import { tryGenerateAvatarVideo } from "../../video/avatar/hfSpaceClient";
import type { NarrationStageResult } from "./05-narration";

const WIDTH = 1080;
const HEIGHT = 1920;

export async function runVideo(
  heroImagePath: string | null,
  sceneImagePaths: string[],
  narration: NarrationStageResult,
  outDir: string
): Promise<string> {
  const scenes: VideoScene[] = sceneImagePaths.map((imagePath, i) => ({
    imagePath,
    durationSec: Math.max(1, narration.scenes[i].durationMs / 1000),
  }));

  let offsetMs = 0;
  const sceneCues: SceneCues[] = narration.scenes.map((s) => {
    const entry = { cues: s.cues, offsetMs };
    offsetMs += s.durationMs;
    return entry;
  });

  const assPath = path.join(outDir, "legendas.ass");
  await fs.writeFile(assPath, buildAssContent(sceneCues, WIDTH, HEIGHT), "utf-8");

  const videoPath = path.join(outDir, "video.mp4");
  await renderSceneVideo(scenes, narration.combinedAudioPath, assPath, FONTS_DIR, videoPath);

  // Melhoria opcional e best-effort (Fase 4): só roda se HF_AVATAR_SPACE estiver configurado
  // e houver uma foto de referência (formato "imagem" selecionado); nunca bloqueia nem
  // substitui o vídeo faceless acima.
  if (heroImagePath) {
    await tryGenerateAvatarVideo(
      heroImagePath,
      narration.combinedAudioPath,
      path.join(outDir, "video-avatar.mp4")
    );
  }

  return videoPath;
}
