import { anthropic, SCRIPT_MODEL } from "./anthropic";
import { SCRIPT_SYSTEM_PROMPT, SCRIPT_JSON_SCHEMA } from "./prompts/script-pt-br";
import { generateScriptViaPollinations } from "./pollinationsText";
import type { ResearchResult, ScriptResult } from "../jobs/types";

async function generateScriptViaAnthropic(
  topic: string,
  research: ResearchResult
): Promise<ScriptResult> {
  const sourcesText = research.sources
    .map((s) => `- (${s.publishedDate || "sem data"}) ${s.title}: ${s.content}`)
    .join("\n");

  const message = await anthropic.messages.parse({
    model: SCRIPT_MODEL,
    max_tokens: 2048,
    system: SCRIPT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Assunto: ${topic}\n\nResumo da pesquisa: ${research.answer}\n\nFontes:\n${sourcesText}`,
      },
    ],
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: SCRIPT_JSON_SCHEMA },
    },
  });

  if (!message.parsed_output) {
    throw new Error("Claude não retornou saída estruturada para o roteiro.");
  }
  return message.parsed_output as ScriptResult;
}

/** Usa Claude só se explicitamente ligado (SCRIPT_PROVIDER=anthropic) E com a chave configurada;
 *  caso contrário usa o texto gratuito da Pollinations.ai (sem chave, sem custo) — esse é o padrão.
 *  Checar SCRIPT_PROVIDER em vez de só a presença de ANTHROPIC_API_KEY evita usar sem querer uma
 *  chave que já esteja no ambiente do shell por outro motivo (ex.: o próprio Claude Code). */
export async function generateScript(
  topic: string,
  research: ResearchResult
): Promise<ScriptResult> {
  if (process.env.SCRIPT_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return generateScriptViaAnthropic(topic, research);
  }
  return generateScriptViaPollinations(topic, research);
}
