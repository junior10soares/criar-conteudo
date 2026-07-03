import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs/promises";
import { loadFonts } from "../carousel/render";

/** Gera localmente uma imagem de fundo em gradiente (sem rede), usada quando a Pollinations falha
 *  mesmo após as tentativas de novo — garante que o job nunca trava só por causa de uma imagem. */
export async function generatePlaceholderImage(
  outPath: string,
  width: number,
  height: number
): Promise<void> {
  const fonts = await loadFonts();
  const svg = await satori(
    <div
      style={{
        width,
        height,
        display: "flex",
        background: "linear-gradient(135deg, #1b1330 0%, #2a1a3d 45%, #3a1730 100%)",
      }}
    />,
    { width, height, fonts }
  );
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
  await fs.writeFile(outPath, png);
}
