import fs from "node:fs/promises";
import { withRetry } from "../net/retry";

interface GenerateImageOptions {
  width?: number;
  height?: number;
  seed?: number;
}

// A Pollinations gratuita só aceita 1 requisição de imagem em voo por IP — pedir a próxima logo
// depois da anterior terminar (ex.: a cena 1 logo após a imagem hero) corre risco de bater nesse
// limite antes do slot ser liberado do lado do servidor e falhar, mesmo esperando a resposta
// anterior. Um intervalo mínimo entre o FIM de uma chamada e o INÍCIO da próxima evita isso — é
// o motivo real por trás do "vídeo sempre começa com o degradê" (cena 1 caindo no fallback).
const MIN_GAP_MS = 4000;
let lastCallFinishedAt = 0;

async function waitForSlot(): Promise<void> {
  const elapsed = Date.now() - lastCallFinishedAt;
  if (elapsed < MIN_GAP_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_GAP_MS - elapsed));
  }
}

/** Downloads a free Pollinations.ai (Flux) image for `prompt` into `outPath`. No API key required. */
export async function generateImage(
  prompt: string,
  outPath: string,
  { width = 1024, height = 1024, seed }: GenerateImageOptions = {}
): Promise<void> {
  await waitForSlot();
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  // "flux" não existe mais no tier anônimo (confirmado via GET /models) — a API aceita o
  // parâmetro mas reroteia por baixo dos panos pra "sana" através de um caminho que falha
  // direto com "fetch failed". Pedir "sana" explicitamente funciona (~30-40s por imagem, é o
  // único modelo do tier gratuito hoje).
  url.searchParams.set("model", "sana");
  url.searchParams.set("nologo", "true");
  if (seed !== undefined) url.searchParams.set("seed", String(seed));

  try {
    await withRetry(async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) {
        throw new Error(`Pollinations retornou ${res.status} para o prompt: ${prompt}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(outPath, buffer);
    });
  } finally {
    lastCallFinishedAt = Date.now();
  }
}
