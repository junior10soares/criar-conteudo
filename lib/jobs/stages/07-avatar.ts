import fs from "node:fs/promises";
import path from "node:path";
import { mp3ToWav } from "../../video/avatar/audioConvert";
import { runRhubarb } from "../../video/avatar/rhubarb";
import { mapMouthCuesToVisemeTimeline } from "../../video/avatar/visemeMap";
import { renderAvatarClip } from "../../video/avatar/vrmRenderer";
import { compositeAvatarOverlay } from "../../video/render";
import { getMediaDurationMs } from "../../video/probe";
import type { NarrationStageResult } from "./05-narration";

const VRM_PATH = path.join(process.cwd(), "assets", "avatar", "avatar.vrm");

/** Overlay opcional e best-effort de um avatar 3D (VRM) com lip-sync real, sobre o vídeo faceless
 *  já gerado. Sem `assets/avatar/avatar.vrm`, ou em qualquer falha (Rhubarb ausente, Playwright
 *  falhar, ffmpeg falhar), não faz nada — `videoPath` já produzido pela etapa anterior fica
 *  intacto. Nunca é o único caminho pra ter vídeo, mesma filosofia do avatar via Hugging Face
 *  Space em `lib/video/avatar/hfSpaceClient.ts`. */
export async function runAvatarOverlay(videoPath: string, narration: NarrationStageResult, outDir: string): Promise<void> {
  try {
    await fs.access(VRM_PATH);
  } catch {
    return;
  }

  const tmpDir = path.join(outDir, ".avatar-tmp");
  try {
    await fs.mkdir(tmpDir, { recursive: true });

    const wavPath = path.join(tmpDir, "narracao.wav");
    await mp3ToWav(narration.combinedAudioPath, wavPath);

    const cuesJsonPath = path.join(tmpDir, "rhubarb.json");
    const rhubarbOutput = await runRhubarb(wavPath, cuesJsonPath);
    const visemeCues = mapMouthCuesToVisemeTimeline(rhubarbOutput.mouthCues);

    const durationMs = await getMediaDurationMs(narration.combinedAudioPath);
    const avatarClipPath = path.join(tmpDir, "avatar.mp4");
    const framesDir = path.join(tmpDir, "frames");
    await renderAvatarClip(VRM_PATH, visemeCues, durationMs, avatarClipPath, framesDir);

    const compositedPath = path.join(tmpDir, "video-with-avatar.mp4");
    await compositeAvatarOverlay(videoPath, avatarClipPath, compositedPath);
    await fs.rename(compositedPath, videoPath);
  } catch (err) {
    console.warn("Overlay do avatar 3D falhou, seguindo só com o vídeo faceless:", err);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
