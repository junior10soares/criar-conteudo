import fs from "node:fs/promises";
import path from "node:path";
import { generateScript } from "../../ai/generateScript";
import type { ResearchResult, ScriptResult } from "../types";

export async function runScript(
  topic: string,
  research: ResearchResult,
  outDir: string
): Promise<ScriptResult> {
  const script = await generateScript(topic, research);
  await fs.writeFile(path.join(outDir, "script.json"), JSON.stringify(script, null, 2));
  await fs.writeFile(path.join(outDir, "legenda.txt"), script.postCaption, "utf-8");
  return script;
}
