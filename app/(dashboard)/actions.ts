"use server";

import { randomUUID } from "node:crypto";
import { insertJob } from "@/lib/jobs/db";
import { enqueue } from "@/lib/jobs/queue";
import { DEFAULT_VOICE } from "@/lib/tts/voices";
import type { ContentFormat } from "@/lib/jobs/types";

export async function createJob(
  topic: string,
  voice: string,
  formats: ContentFormat[]
): Promise<{ jobId: string }> {
  const cleanTopic = topic.trim();
  if (!cleanTopic) {
    throw new Error("Digite um assunto para gerar o conteúdo.");
  }
  if (formats.length === 0) {
    throw new Error("Escolha pelo menos um formato de conteúdo.");
  }

  const id = randomUUID();
  insertJob(id, cleanTopic, voice || DEFAULT_VOICE, formats);
  enqueue();

  return { jobId: id };
}
