import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const run = promisify(execFile);

const RHUBARB_BIN = path.join(process.cwd(), "vendor", "rhubarb", "rhubarb");

export type MouthShape = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X";

export interface MouthCue {
  start: number;
  end: number;
  value: MouthShape;
}

export interface RhubarbOutput {
  metadata: { duration: number };
  mouthCues: MouthCue[];
}

/** Analisa `wavPath` e gera o timing de mouth shapes (visemes). `--recognizer phonetic` é
 *  obrigatório pra áudio fora do inglês (o reconhecedor padrão só entende palavras em inglês). */
export async function runRhubarb(wavPath: string, outJsonPath: string): Promise<RhubarbOutput> {
  await run(RHUBARB_BIN, ["-r", "phonetic", "-f", "json", "-o", outJsonPath, wavPath], {
    maxBuffer: 1024 * 1024 * 16,
  });
  return JSON.parse(await fs.readFile(outJsonPath, "utf-8"));
}
