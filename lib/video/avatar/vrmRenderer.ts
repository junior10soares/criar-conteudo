import { createServer, type Server } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { FFMPEG_BIN, run } from "../render";
import type { VisemeCue } from "./visemeMap";

const RENDERER_DIR = path.join(process.cwd(), "lib", "video", "avatar", "renderer");
const SIZE = 240;
// Metade do FPS do vídeo principal (30): renderizar WebGL headless exige um readback de
// framebuffer da GPU por frame (~150-200ms medido a 240px) — 15fps mantém o lip-sync visualmente
// suave e corta o tempo de render pela metade. O overlay final no ffmpeg lida bem com o
// descompasso de frame rate entre o clipe do avatar e o vídeo base.
const AVATAR_FPS = 15;
const RENDER_TIMEOUT_MS = 5 * 60_000;
// Poucos frames por rodada de page.evaluate — reduz round-trips sem acumular um payload
// base64 gigante na memória pra vídeos longos.
const BATCH_SIZE = 10;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".vrm": "application/octet-stream",
};

function startStaticServer(vrmPath: string, cuesJson: string): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = (req.url ?? "/").split("?")[0];
        if (url === "/cues.json") {
          res.writeHead(200, { "content-type": CONTENT_TYPES[".json"] });
          res.end(cuesJson);
          return;
        }
        if (url === "/avatar.vrm") {
          res.writeHead(200, { "content-type": CONTENT_TYPES[".vrm"] });
          res.end(await readFile(vrmPath));
          return;
        }
        const filePath = url === "/" ? path.join(RENDERER_DIR, "index.html") : path.join(RENDERER_DIR, url);
        if (!filePath.startsWith(RENDERER_DIR)) {
          res.writeHead(403).end();
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream" });
        res.end(await readFile(filePath));
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Servidor estático do avatar não conseguiu abrir uma porta."));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

/** Renderiza o avatar VRM com lip-sync (fundo verde puro, sem áudio) num clipe mp4 com a duração
 *  exata de `durationMs`, avançando frame a frame de forma determinística (não é captura em
 *  tempo real) — garante frame count == durationMs × FPS pra casar com o vídeo principal. */
export async function renderAvatarClip(
  vrmPath: string,
  visemeCues: VisemeCue[],
  durationMs: number,
  outPath: string,
  framesDir: string
): Promise<void> {
  await mkdir(framesDir, { recursive: true });
  const { server, port } = await startStaticServer(vrmPath, JSON.stringify(visemeCues));
  const browser = await chromium.launch();

  try {
    await withTimeout(async () => {
      const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
      await page.goto(`http://127.0.0.1:${port}/?vrm=avatar.vrm&cues=cues.json`);
      await page.waitForFunction(() => window.__ready === true, undefined, { timeout: 30_000 });

      const totalFrames = Math.max(1, Math.ceil((durationMs / 1000) * AVATAR_FPS));
      for (let batchStart = 0; batchStart < totalFrames; batchStart += BATCH_SIZE) {
        const count = Math.min(BATCH_SIZE, totalFrames - batchStart);
        // Renderiza e codifica o lote inteiro dentro do browser (canvas.toDataURL, sem passar
        // pelo pipeline de screenshot do Playwright) — evita repetir o custo fixo de round-trip
        // do CDP por frame; o gargalo real é o readback do framebuffer WebGL em si.
        const frames = await page.evaluate(
          ({ start, count, fps }) => {
            const canvas = document.getElementById("c") as HTMLCanvasElement;
            const out: string[] = [];
            for (let i = 0; i < count; i++) {
              window.__seekAndRender((start + i) * (1000 / fps));
              out.push(canvas.toDataURL("image/png"));
            }
            return out;
          },
          { start: batchStart, count, fps: AVATAR_FPS }
        );

        for (let i = 0; i < frames.length; i++) {
          const base64 = frames[i].split(",")[1];
          const frameIndex = batchStart + i;
          await writeFile(
            path.join(framesDir, `frame-${String(frameIndex).padStart(6, "0")}.png`),
            Buffer.from(base64, "base64")
          );
        }
      }
    }, RENDER_TIMEOUT_MS);
  } finally {
    await browser.close();
    server.close();
  }

  await run(FFMPEG_BIN, [
    "-y",
    "-framerate",
    String(AVATAR_FPS),
    "-i",
    path.join(framesDir, "frame-%06d.png"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    outPath,
  ]);
}

async function withTimeout(fn: () => Promise<void>, timeoutMs: number): Promise<void> {
  let timer: NodeJS.Timeout;
  await Promise.race([
    fn(),
    new Promise<void>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Render do avatar 3D excedeu o tempo limite.")), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}
