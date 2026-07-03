import fs from "node:fs/promises";
import path from "node:path";
import { generateImage } from "../../images/pollinations";
import { generatePlaceholderImage } from "../../images/placeholder";
import type { ScriptResult } from "../types";

const GALLERY_COUNT = 6;

export interface ImagesResult {
  heroImagePath: string | null;
  galleryImagePaths: string[];
  sceneImagePaths: string[];
}

async function generateImageWithFallback(
  prompt: string,
  outPath: string,
  width: number,
  height: number,
  seed?: number
): Promise<string> {
  try {
    await generateImage(prompt, outPath, { width, height, seed });
    return outPath;
  } catch {
    // Pollinations é gratuito e sem SLA — se falhar mesmo após as tentativas, usa um fundo
    // gerado localmente (sem rede) pra não travar o job inteiro por causa de 1 imagem.
    const placeholderPath = outPath.replace(/\.jpg$/, ".png");
    await generatePlaceholderImage(placeholderPath, width, height);
    return placeholderPath;
  }
}

export async function runImages(
  script: ScriptResult,
  outDir: string,
  {
    needsHero,
    needsGallery,
    needsScenes,
  }: { needsHero: boolean; needsGallery: boolean; needsScenes: boolean }
): Promise<ImagesResult> {
  let heroImagePath: string | null = null;
  const galleryImagePaths: string[] = [];

  if (needsGallery) {
    // Formato "imagem" sempre entrega 6 variações (mesmo prompt, seeds diferentes) pra virar
    // um mini banco de imagens pro post, não só uma foto avulsa.
    for (let i = 0; i < GALLERY_COUNT; i++) {
      const galleryPath = await generateImageWithFallback(
        script.heroImagePrompt,
        path.join(outDir, `imagem-${i + 1}.jpg`),
        1080,
        1350,
        i
      );
      galleryImagePaths.push(galleryPath);
    }
    heroImagePath = galleryImagePaths[0];
  } else if (needsHero) {
    heroImagePath = await generateImageWithFallback(
      script.heroImagePrompt,
      path.join(outDir, "imagem.jpg"),
      1080,
      1350
    );
  }

  const sceneImagePaths: string[] = [];
  if (needsScenes) {
    const scenesDir = path.join(outDir, "cenas");
    await fs.mkdir(scenesDir, { recursive: true });
    for (let i = 0; i < script.videoScenes.length; i++) {
      // Chamadas sequenciais: Pollinations é gratuito e sem chave, mas sem SLA de rate-limit publicado.
      const scenePath = await generateImageWithFallback(
        script.videoScenes[i].imagePrompt,
        path.join(scenesDir, `cena-${i + 1}.jpg`),
        1080,
        1920,
        i
      );
      sceneImagePaths.push(scenePath);
    }
  }

  return { heroImagePath, galleryImagePaths, sceneImagePaths };
}
