"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles, Loader2, Mic, Image as ImageIcon, LayoutGrid, Clapperboard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PT_BR_VOICES, DEFAULT_VOICE } from "@/lib/tts/voices";
import { createJob } from "@/app/(dashboard)/actions";
import { CONTENT_FORMATS, type ContentFormat } from "@/lib/jobs/types";

const FORMAT_ICONS: Record<ContentFormat, typeof Sparkles> = {
  texto: Sparkles,
  imagem: ImageIcon,
  carrossel: LayoutGrid,
  video: Clapperboard,
};

export function TopicForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [voice, setVoice] = useState(DEFAULT_VOICE);
  const [formats, setFormats] = useState<ContentFormat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFormat(format: ContentFormat, checked: boolean) {
    setFormats((prev) => (checked ? [...prev, format] : prev.filter((f) => f !== format)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formats.length === 0) {
      setError("Escolha pelo menos um formato de conteúdo.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { jobId } = await createJob(topic, voice, formats);
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar job.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="gradient-border p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            O que vamos <span className="gradient-text">criar</span> hoje?
          </h1>
          <p className="text-muted-foreground">
            Digite qualquer assunto. Nós pesquisamos informação atualizada e geramos texto,
            imagem, carrossel e vídeo narrado com avatar — sem você precisar aparecer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="topic">Assunto</Label>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: benefícios do treino de força após os 40 anos"
              rows={3}
              className="w-full rounded-lg border border-input bg-input/10 px-4 py-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
            />
          </div>

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="voice">
              <Mic className="inline size-4 mr-1" /> Voz da narração
            </Label>
            <Select value={voice} onValueChange={(v) => v && setVoice(v)}>
              <SelectTrigger id="voice" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PT_BR_VOICES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>O que você quer gerar?</Label>
            <div className="flex flex-wrap gap-3">
              {CONTENT_FORMATS.map(({ id, label }) => {
                const Icon = FORMAT_ICONS[id];
                const checked = formats.includes(id);
                return (
                  <motion.label
                    key={id}
                    htmlFor={`format-${id}`}
                    whileHover={{ scale: 1.05 }}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                      checked
                        ? "border-primary/50 bg-primary/15"
                        : "border-border bg-secondary/60 opacity-60"
                    }`}
                  >
                    <Checkbox
                      id={`format-${id}`}
                      checked={checked}
                      onCheckedChange={(next) => toggleFormat(id, next)}
                    />
                    <Icon className="size-4 text-primary" />
                    {label}
                  </motion.label>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              size="lg"
              disabled={loading || !topic.trim() || formats.length === 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" /> Criando...
                </>
              ) : !topic.trim() ? (
                <>
                  <Lock /> Digite um assunto para gerar
                </>
              ) : formats.length === 0 ? (
                <>
                  <Lock /> Marque pelo menos um formato
                </>
              ) : (
                <>
                  <Sparkles /> Gerar conteúdo
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </Card>
    </motion.div>
  );
}
