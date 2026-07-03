export type JobStatus = "queued" | "running" | "done" | "error";

export type ContentFormat = "texto" | "imagem" | "carrossel" | "video";

export const CONTENT_FORMATS: { id: ContentFormat; label: string }[] = [
  { id: "texto", label: "Texto" },
  { id: "imagem", label: "Imagem" },
  { id: "carrossel", label: "Carrossel" },
  { id: "video", label: "Vídeo com narração" },
];

export type JobStage =
  | "queued"
  | "research"
  | "script"
  | "images"
  | "carousel"
  | "narration"
  | "video"
  | "avatar"
  | "done";

export const STAGE_LABELS: Record<JobStage, string> = {
  queued: "Na fila",
  research: "Pesquisando informações atualizadas",
  script: "Gerando texto e roteiro",
  images: "Gerando imagens",
  carousel: "Montando carrossel",
  narration: "Gerando narração",
  video: "Renderizando vídeo",
  avatar: "Sincronizando avatar 3D (opcional)",
  done: "Concluído",
};

export const STAGE_ORDER: JobStage[] = [
  "queued",
  "research",
  "script",
  "images",
  "carousel",
  "narration",
  "video",
  "avatar",
  "done",
];

const STAGE_REQUIRES_FORMAT: Partial<Record<JobStage, ContentFormat[]>> = {
  images: ["imagem", "carrossel", "video"],
  carousel: ["carrossel"],
  narration: ["video"],
  video: ["video"],
  avatar: ["video"],
};

/** Estágios visíveis pra um job, considerando os formatos escolhidos (ex.: pula "carousel" se
 *  "carrossel" não foi selecionado). */
export function visibleStages(formats: ContentFormat[]): JobStage[] {
  return STAGE_ORDER.filter((stage) => {
    const required = STAGE_REQUIRES_FORMAT[stage];
    return !required || required.some((f) => formats.includes(f));
  });
}

export interface JobRecord {
  id: string;
  topic: string;
  voice: string;
  formats: ContentFormat[];
  status: JobStatus;
  stage: JobStage;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptResult {
  postCaption: string;
  heroImagePrompt: string;
  carouselSlides: { title: string; body: string }[];
  videoScenes: { narration: string; imagePrompt: string }[];
}

export interface ResearchResult {
  answer: string;
  sources: { title: string; url: string; content: string; publishedDate: string }[];
}
