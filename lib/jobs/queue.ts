import { nextQueuedJob } from "./db";
import { runPipeline } from "./pipeline";

declare global {
  var __cc_worker: { running: boolean } | undefined;
}

const worker = globalThis.__cc_worker ?? (globalThis.__cc_worker = { running: false });

async function loop() {
  if (worker.running) return;
  worker.running = true;
  try {
    for (;;) {
      const job = nextQueuedJob();
      if (!job) break;
      await runPipeline(job);
    }
  } finally {
    worker.running = false;
  }
}

/** Wakes the single in-process worker to process queued jobs (no-op if it's already running). */
export function enqueue() {
  void loop();
}
