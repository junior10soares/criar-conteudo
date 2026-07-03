// Baixa e vendoriza o binário do Rhubarb Lip Sync (github.com/DanielSWolf/rhubarb-lip-sync).
// Execução manual única (`npm run setup:rhubarb`), não roda em postinstall.
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, mkdir, readdir, rename, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const VERSION = "1.13.0";
const URL = `https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${VERSION}/Rhubarb-Lip-Sync-${VERSION}-Linux.zip`;
const VENDOR_DIR = path.join(process.cwd(), "vendor", "rhubarb");

async function main() {
  if (existsSync(path.join(VENDOR_DIR, "rhubarb")) && !process.argv.includes("--force")) {
    console.log("Rhubarb já vendorizado em vendor/rhubarb/ — nada a fazer (use --force pra refazer).");
    return;
  }

  const tmp = await mkdtemp(path.join(tmpdir(), "rhubarb-setup-"));
  try {
    const zipPath = path.join(tmp, "rhubarb.zip");
    console.log(`Baixando ${URL}...`);
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`Download falhou: HTTP ${res.status}`);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(zipPath, Buffer.from(await res.arrayBuffer()));

    console.log("Extraindo...");
    execFileSync("unzip", ["-oq", zipPath, "-d", tmp]);

    const extracted = (await readdir(tmp, { withFileTypes: true })).find(
      (e) => e.isDirectory() && e.name.startsWith("Rhubarb-Lip-Sync")
    );
    if (!extracted) throw new Error("Não encontrei a pasta extraída do Rhubarb no zip.");

    await rm(VENDOR_DIR, { recursive: true, force: true });
    await mkdir(path.dirname(VENDOR_DIR), { recursive: true });
    await rename(path.join(tmp, extracted.name), VENDOR_DIR);
    await chmod(path.join(VENDOR_DIR, "rhubarb"), 0o755);

    console.log(`Rhubarb vendorizado em ${VENDOR_DIR}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("Falha ao configurar o Rhubarb:", err);
  process.exit(1);
});
