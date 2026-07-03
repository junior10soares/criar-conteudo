"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { visibleStages, STAGE_LABELS, type JobRecord, type JobStage } from "@/lib/jobs/types";
import { DownloadLinks } from "./DownloadLinks";

export function JobProgress({ jobId, initialJob }: { jobId: string; initialJob: JobRecord }) {
  const [job, setJob] = useState<JobRecord>(initialJob);

  useEffect(() => {
    if (job.status === "done" || job.status === "error") return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      if (res.ok) setJob(await res.json());
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId, job.status]);

  const stages: JobStage[] = visibleStages(job.formats).filter(
    (s) => s !== "queued" && s !== "done"
  );
  const currentIndex = stages.indexOf(job.stage);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const done = job.status === "done" || i < currentIndex;
          const active = job.status === "running" && i === currentIndex;
          const failed = job.status === "error" && i === currentIndex;
          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              {failed ? (
                <XCircle className="size-5 text-destructive" />
              ) : done ? (
                <CheckCircle2 className="size-5 text-primary" />
              ) : active ? (
                <Loader2 className="size-5 text-primary animate-spin" />
              ) : (
                <CircleDashed className="size-5 text-muted-foreground/40" />
              )}
              <span
                className={
                  done || active || failed ? "text-foreground" : "text-muted-foreground/50"
                }
              >
                {STAGE_LABELS[stage]}
              </span>
            </motion.div>
          );
        })}
      </div>

      {job.status === "error" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Deu erro: {job.error}
        </motion.p>
      )}

      <AnimatePresence>
        {job.status === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <DownloadLinks jobId={jobId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
