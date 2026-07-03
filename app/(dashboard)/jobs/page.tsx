import Link from "next/link";
import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import { listJobs } from "@/lib/jobs/db";
import { Card } from "@/components/ui/card";

const STATUS_ICON = {
  done: CheckCircle2,
  running: Loader2,
  error: XCircle,
  queued: Clock,
} as const;

export default async function JobsHistoryPage() {
  const jobs = listJobs();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Histórico</h1>

      {jobs.length === 0 && (
        <p className="text-muted-foreground">Nenhum conteúdo gerado ainda.</p>
      )}

      <div className="space-y-3">
        {jobs.map((job) => {
          const Icon = STATUS_ICON[job.status];
          return (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="flex-row items-center gap-3 p-4 hover:border-primary/50 transition-colors">
                <Icon
                  className={`size-5 shrink-0 ${
                    job.status === "running" ? "animate-spin text-primary" : ""
                  } ${job.status === "done" ? "text-primary" : ""} ${
                    job.status === "error" ? "text-destructive" : ""
                  } ${job.status === "queued" ? "text-muted-foreground" : ""}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{job.topic}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
