import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { jobOutputDir } from "@/lib/downloads/paths";

async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`)));
    } else {
      files.push(`${prefix}${entry.name}`);
    }
  }
  return files.sort();
}

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const files = await listFiles(jobOutputDir(jobId));
  return NextResponse.json({ files });
}
