"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Download, FileText, ImageIcon, LayoutGrid, Music, Video } from "lucide-react";
import { Card } from "@/components/ui/card";

function iconFor(file: string) {
  if (file.startsWith("carrossel/")) return LayoutGrid;
  if (file.endsWith(".mp4")) return Video;
  if (file.endsWith(".mp3")) return Music;
  if (file.endsWith(".png") || file.endsWith(".jpg")) return ImageIcon;
  return FileText;
}

function labelFor(file: string) {
  const names: Record<string, string> = {
    "legenda.txt": "Legenda do post",
    "imagem.jpg": "Imagem",
    "imagem.png": "Imagem",
    "narracao.mp3": "Áudio da narração",
    "video.mp4": "Vídeo narrado",
    "video-avatar.mp4": "Vídeo com avatar realista (experimental)",
  };
  if (names[file]) return names[file];
  const galleryMatch = file.match(/^imagem-(\d+)\.(jpg|png)$/);
  if (galleryMatch) return `Imagem ${galleryMatch[1]}`;
  return file.replace("carrossel/", "Carrossel — ");
}

export function DownloadLinks({ jobId }: { jobId: string }) {
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/manifest`)
      .then((r) => r.json())
      .then((data) => setFiles(data.files ?? []));
  }, [jobId]);

  const downloadable = files.filter(
    (f) => !f.startsWith("cenas/") && !f.endsWith(".json") && !f.endsWith(".ass")
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Pronto! Baixe seu conteúdo</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {downloadable.map((file, i) => {
          const Icon = iconFor(file);
          return (
            <motion.a
              key={file}
              href={`/api/jobs/${jobId}/download/${file}`}
              download
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="block"
            >
              <Card className="flex-row items-center gap-3 p-4 hover:border-primary/50 transition-colors">
                <div className="rounded-full bg-primary/15 p-2">
                  <Icon className="size-5 text-primary" />
                </div>
                <span className="flex-1 text-sm font-medium">{labelFor(file)}</span>
                <Download className="size-4 text-muted-foreground" />
              </Card>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
