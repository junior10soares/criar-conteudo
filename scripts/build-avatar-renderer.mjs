// Builda o bundle de browser (three.js + @pixiv/three-vrm) usado pelo renderer headless do
// avatar 3D. Rodar manualmente (`npm run build:avatar-renderer`) sempre que main.ts mudar — o
// bundle gerado é committed, não é rebuildado a cada job.
import { build } from "esbuild";
import path from "node:path";

const DIR = path.join(process.cwd(), "lib", "video", "avatar", "renderer");

await build({
  entryPoints: [path.join(DIR, "src", "main.ts")],
  bundle: true,
  format: "esm",
  target: "chrome120",
  outfile: path.join(DIR, "dist", "bundle.js"),
});

console.log("Bundle do renderer de avatar gerado em lib/video/avatar/renderer/dist/bundle.js");
