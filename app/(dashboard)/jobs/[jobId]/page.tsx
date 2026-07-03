import { notFound } from "next/navigation";
import { getJob } from "@/lib/jobs/db";
import { JobProgress } from "@/components/dashboard/JobProgress";
import { Card } from "@/components/ui/card";

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) notFound();

  return (
    <Card className="gradient-border space-y-6 p-8">
      <div>
        <p className="text-sm text-muted-foreground">Assunto</p>
        <h1 className="text-2xl font-bold">{job.topic}</h1>
      </div>
      <JobProgress jobId={jobId} initialJob={job} />
    </Card>
  );
}
