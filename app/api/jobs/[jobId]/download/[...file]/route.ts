import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { resolveDownloadPath, contentTypeFor } from "@/lib/downloads/paths";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string; file: string[] }> }
) {
  const { jobId, file } = await params;
  const filePath = resolveDownloadPath(jobId, file);
  if (!filePath) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");

    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentTypeFor(filePath),
        "Content-Length": String(info.size),
        "Content-Disposition": `attachment; filename="${file[file.length - 1]}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}
