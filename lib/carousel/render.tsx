import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs/promises";
import path from "node:path";

const FONTS_DIR = path.join(process.cwd(), "assets", "fonts");
const WIDTH = 1080;
const HEIGHT = 1350;

let fontsCache: { name: string; data: Buffer; weight: 400 | 700 }[] | null = null;

export async function loadFonts() {
  if (fontsCache) return fontsCache;
  const [regular, bold] = await Promise.all([
    fs.readFile(path.join(FONTS_DIR, "Poppins-Regular.ttf")),
    fs.readFile(path.join(FONTS_DIR, "Poppins-Bold.ttf")),
  ]);
  fontsCache = [
    { name: "Poppins", data: regular, weight: 400 },
    { name: "Poppins", data: bold, weight: 700 },
  ];
  return fontsCache;
}

interface Slide {
  title: string;
  body: string;
  index: number;
  total: number;
  backgroundDataUri: string | null;
}

function Slide({ title, body, index, total, backgroundDataUri }: Slide) {
  const background = backgroundDataUri
    ? `linear-gradient(180deg, rgba(20,10,30,0.35) 0%, rgba(20,10,30,0.55) 55%, rgba(20,10,30,0.92) 100%), url(${backgroundDataUri})`
    : "linear-gradient(135deg, #1b1330 0%, #2a1a3d 45%, #3a1730 100%)";

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#fff",
        fontFamily: "Poppins",
      }}
    >
      <div style={{ fontSize: 28, opacity: 0.7, letterSpacing: 2 }}>{`${index + 1} / ${total}`}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
        <div style={{ fontSize: 34, lineHeight: 1.4, opacity: 0.9, maxWidth: 880 }}>{body}</div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === index ? 40 : 14,
              height: 8,
              borderRadius: 4,
              background: i === index ? "#fff" : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

async function toDataUri(imagePath: string): Promise<string> {
  const buffer = await fs.readFile(imagePath);
  // Fundos gerados localmente (fallback quando a Pollinations falha) são .png; os reais da
  // Pollinations são .jpg — o mime precisa bater com o conteúdo real pro resvg conseguir decodificar.
  const mime = path.extname(imagePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/** Renders a title+body slide deck into numbered PNG files under `outDir` (slide-1.png, slide-2.png, ...).
 *  When `backgroundImagePaths` is given, slide `i` uses `backgroundImagePaths[i % length]` as a dimmed photo background. */
export async function renderCarousel(
  slides: { title: string; body: string }[],
  outDir: string,
  backgroundImagePaths: string[] = []
): Promise<string[]> {
  const fonts = await loadFonts();
  const paths: string[] = [];

  for (let i = 0; i < slides.length; i++) {
    const backgroundDataUri = backgroundImagePaths.length
      ? await toDataUri(backgroundImagePaths[i % backgroundImagePaths.length])
      : null;

    const svg = await satori(
      <Slide {...slides[i]} index={i} total={slides.length} backgroundDataUri={backgroundDataUri} />,
      { width: WIDTH, height: HEIGHT, fonts }
    );
    const png = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
    const filePath = path.join(outDir, `slide-${i + 1}.png`);
    await fs.writeFile(filePath, png);
    paths.push(filePath);
  }

  return paths;
}
