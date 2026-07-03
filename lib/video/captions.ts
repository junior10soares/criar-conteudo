import type { SubtitleCue } from "../tts/edgeTts";

export interface SceneCues {
  cues: SubtitleCue[];
  offsetMs: number;
}

const MAX_CHUNK_MS = 1800;
const MAX_CHUNK_WORDS = 4;

function toAssTime(ms: number): string {
  const totalCs = Math.max(0, Math.round(ms / 10));
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAss(text: string): string {
  return text.replace(/\n/g, " ").replace(/{/g, "(").replace(/}/g, ")");
}

/** Groups word-level cues into short (<=4 word / <=1.8s) burned-caption chunks, offset into the full timeline. */
function chunkCues(scenes: SceneCues[]): { text: string; startMs: number; endMs: number }[] {
  const chunks: { text: string; startMs: number; endMs: number }[] = [];

  for (const { cues, offsetMs } of scenes) {
    let current: SubtitleCue[] = [];

    const flush = () => {
      if (!current.length) return;
      chunks.push({
        text: current.map((c) => c.part).join(" ").trim(),
        startMs: offsetMs + current[0].start,
        endMs: offsetMs + current[current.length - 1].end,
      });
      current = [];
    };

    for (const cue of cues) {
      const wouldSpan = current.length ? cue.end - current[0].start : 0;
      if (current.length >= MAX_CHUNK_WORDS || wouldSpan > MAX_CHUNK_MS) flush();
      current.push(cue);
    }
    flush();
  }

  return chunks;
}

/** Builds a styled .ass subtitle file (short burned caption chunks) from per-scene word timings. */
export function buildAssContent(scenes: SceneCues[], width: number, height: number): string {
  const chunks = chunkCues(scenes);

  const events = chunks
    .map(
      (c) =>
        `Dialogue: 0,${toAssTime(c.startMs)},${toAssTime(c.endMs)},Default,,0,0,0,,${escapeAss(c.text)}`
    )
    .join("\n");

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Poppins,72,&H00FFFFFF,&H000000FF,&H00201018,&H64000000,-1,0,0,0,100,100,0,0,1,4,0,2,80,80,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}
`;
}
