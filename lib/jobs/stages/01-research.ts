import fs from "node:fs/promises";
import path from "node:path";
import { researchTopic } from "../../research/tavily";
import type { ResearchResult } from "../types";

export async function runResearch(topic: string, outDir: string): Promise<ResearchResult> {
  const research = await researchTopic(topic);
  await fs.writeFile(path.join(outDir, "research.json"), JSON.stringify(research, null, 2));
  return research;
}
