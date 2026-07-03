import fs from "node:fs/promises";
import { Client } from "@gradio/client";

const TIMEOUT_MS = 90_000;

/**
 * Best-effort: tenta gerar um vídeo com avatar com lip-sync real chamando um Hugging Face Space
 * público (ex.: um Space de SadTalker/Wav2Lip/LivePortrait), configurado via HF_AVATAR_SPACE
 * (formato "usuario/nome-do-space" — veja a aba "API" na página do Space para o schema exato).
 *
 * Sem essa env var, ou em qualquer falha/timeout/Space fora do ar, retorna null e o pipeline
 * segue normalmente só com o vídeo faceless (que já foi gerado antes desta chamada) — isso nunca
 * é o único caminho para ter um vídeo.
 */
export async function tryGenerateAvatarVideo(
  imagePath: string,
  audioPath: string,
  outPath: string
): Promise<string | null> {
  const spaceId = process.env.HF_AVATAR_SPACE;
  if (!spaceId) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const client = await Client.connect(spaceId, { events: ["data"] });
    const [imageBuf, audioBuf] = await Promise.all([fs.readFile(imagePath), fs.readFile(audioPath)]);

    const result = await client.predict("/predict", {
      image: new Blob([new Uint8Array(imageBuf)], { type: "image/jpeg" }),
      audio: new Blob([new Uint8Array(audioBuf)], { type: "audio/mpeg" }),
    });

    const output = Array.isArray(result.data) ? (result.data[0] as { url?: string } | undefined) : undefined;
    if (!output?.url) return null;

    const res = await fetch(output.url, { signal: controller.signal });
    if (!res.ok) return null;

    await fs.writeFile(outPath, Buffer.from(await res.arrayBuffer()));
    return outPath;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
