import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs/db";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  }
  return NextResponse.json(job);
}
