import type { MouthCue, MouthShape } from "./rhubarb";

export type VisemePreset = "aa" | "ih" | "ou" | "ee" | "oh" | "neutral";

export interface VisemeCue {
  startMs: number;
  endMs: number;
  preset: VisemePreset;
  weight: number;
}

// Rhubarb tem 9 mouth shapes; VRM só tem os 5 visemes vocálicos (aa/ih/ou/ee/oh) + neutral.
// G (dente-no-lábio) e H (língua atrás dos dentes) não têm equivalente exato — usamos a forma
// visualmente mais próxima disponível.
const SHAPE_TO_VISEME: Record<MouthShape, { preset: VisemePreset; weight: number }> = {
  A: { preset: "neutral", weight: 1 },
  B: { preset: "ih", weight: 1 },
  C: { preset: "ee", weight: 1 },
  D: { preset: "aa", weight: 1 },
  E: { preset: "oh", weight: 1 },
  F: { preset: "ou", weight: 1 },
  G: { preset: "ih", weight: 1 },
  H: { preset: "aa", weight: 0.5 },
  X: { preset: "neutral", weight: 1 },
};

/** Converte os mouth cues do Rhubarb (segundos) numa timeline de visemes VRM (milissegundos). */
export function mapMouthCuesToVisemeTimeline(cues: MouthCue[]): VisemeCue[] {
  return cues.map((cue) => {
    const { preset, weight } = SHAPE_TO_VISEME[cue.value];
    return { startMs: cue.start * 1000, endMs: cue.end * 1000, preset, weight };
  });
}
