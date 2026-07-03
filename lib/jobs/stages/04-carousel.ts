import fs from "node:fs/promises";
import path from "node:path";
import { renderCarousel } from "../../carousel/render";
import type { ScriptResult } from "../types";

export async function runCarousel(
  script: ScriptResult,
  sceneImagePaths: string[],
  outDir: string
): Promise<string[]> {
  const carouselDir = path.join(outDir, "carrossel");
  await fs.mkdir(carouselDir, { recursive: true });
  return renderCarousel(script.carouselSlides, carouselDir, sceneImagePaths);
}
