import fs from "node:fs/promises";
import { jobOutputDir } from "../downloads/paths";
import { updateJobStage, updateJobStatus } from "./db";
import { runResearch } from "./stages/01-research";
import { runScript } from "./stages/02-script";
import { runImages } from "./stages/03-images";
import { runCarousel } from "./stages/04-carousel";
import { runNarration } from "./stages/05-narration";
import { runVideo } from "./stages/06-video";
import { runAvatarOverlay } from "./stages/07-avatar";
import type { JobRecord } from "./types";

export async function runPipeline(job: JobRecord): Promise<void> {
  const outDir = jobOutputDir(job.id);
  await fs.mkdir(outDir, { recursive: true });

  const wants = (format: JobRecord["formats"][number]) => job.formats.includes(format);
  const needsCarousel = wants("carrossel");
  const needsVideo = wants("video");
  const needsGallery = wants("imagem");
  // Vídeo sempre gera (ao menos) uma imagem de referência, mesmo sem "imagem" selecionado —
  // é o que alimenta a tentativa opcional de avatar realista (Fase 4).
  const needsHero = needsGallery || needsVideo;
  const needsScenes = needsCarousel || needsVideo;

  try {
    updateJobStatus(job.id, "running");

    updateJobStage(job.id, "research");
    const research = await runResearch(job.topic, outDir);

    updateJobStage(job.id, "script");
    const script = await runScript(job.topic, research, outDir);

    let heroImagePath: string | null = null;
    let sceneImagePaths: string[] = [];
    if (needsHero || needsScenes) {
      updateJobStage(job.id, "images");
      ({ heroImagePath, sceneImagePaths } = await runImages(script, outDir, {
        needsHero,
        needsGallery,
        needsScenes,
      }));
    }

    if (needsCarousel) {
      updateJobStage(job.id, "carousel");
      await runCarousel(script, sceneImagePaths, outDir);
    }

    if (needsVideo) {
      updateJobStage(job.id, "narration");
      const narration = await runNarration(script, job.voice, outDir);

      updateJobStage(job.id, "video");
      const videoPath = await runVideo(heroImagePath, sceneImagePaths, narration, outDir);

      updateJobStage(job.id, "avatar");
      await runAvatarOverlay(videoPath, narration, outDir);
    }

    updateJobStage(job.id, "done");
    updateJobStatus(job.id, "done");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateJobStatus(job.id, "error", message);
  }
}
