import path from "node:path";

const OUTPUTS_ROOT = path.join(process.cwd(), "data", "outputs");

export function jobOutputDir(jobId: string): string {
  return path.join(OUTPUTS_ROOT, jobId);
}

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

/** Resolves `<jobId>/<...file>` to an absolute path, rejecting traversal outside the job's output dir. */
export function resolveDownloadPath(jobId: string, fileParts: string[]): string | null {
  const dir = jobOutputDir(jobId);
  const target = path.normalize(path.join(dir, ...fileParts));
  if (!target.startsWith(dir + path.sep) && target !== dir) return null;
  return target;
}

export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}
