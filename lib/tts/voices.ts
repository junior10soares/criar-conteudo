export interface VoiceOption {
  id: string;
  label: string;
}

export const PT_BR_VOICES: VoiceOption[] = [
  { id: "pt-BR-FranciscaNeural", label: "Francisca (feminina)" },
  { id: "pt-BR-AntonioNeural", label: "Antônio (masculina)" },
];

export const DEFAULT_VOICE = PT_BR_VOICES[0].id;
