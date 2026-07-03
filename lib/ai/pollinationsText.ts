import { SCRIPT_SYSTEM_PROMPT, SCRIPT_JSON_SCHEMA } from "./prompts/script-pt-br";
import { withRetry } from "../net/retry";
import type { ResearchResult, ScriptResult } from "../jobs/types";

const POLLINATIONS_TEXT_MODEL = process.env.POLLINATIONS_TEXT_MODEL ?? "openai";

/** Modelo gratuito às vezes escreve texto extra antes/depois do JSON (markdown, comentário) mesmo
 *  com response_format estrito — extrai só o primeiro objeto `{...}` balanceado, ignorando o resto. */
function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("Resposta da Pollinations não contém um objeto JSON.");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  throw new Error("Resposta da Pollinations tem um JSON incompleto (chaves não fecham).");
}

/** Roteiro via Pollinations.ai (gratuito, sem chave) — modelo aberto (GPT-OSS 20B) via endpoint OpenAI-compatible. */
export async function generateScriptViaPollinations(
  topic: string,
  research: ResearchResult
): Promise<ScriptResult> {
  const sourcesText = research.sources
    .map((s) => `- (${s.publishedDate || "sem data"}) ${s.title}: ${s.content}`)
    .join("\n");

  const userContent = `Assunto: ${topic}\n\nResumo da pesquisa: ${research.answer}\n\nFontes:\n${sourcesText}`;

  // O parse também fica dentro do withRetry: o modelo gratuito às vezes trunca a resposta no
  // meio (JSON incompleto) mesmo com a requisição HTTP tendo sido 200 OK — isso não é uma falha
  // de rede, então precisa do próprio retry pra tentar gerar de novo, não só um novo fetch.
  return await withRetry(async (attempt) => {
    // O backend de saída estruturada (response_format: json_schema) da Pollinations já foi
    // observado retornando 500 "ENOSPC: no space left on device" (disco cheio no servidor
    // deles) enquanto requisições sem response_format funcionam normalmente — na 2ª tentativa em
    // diante, cai pro modo "pede JSON no texto" (sem schema estrito), confiando no
    // extractFirstJsonObject pra extrair o objeto mesmo sem garantia de formato.
    const useStrictSchema = attempt === 0;

    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: POLLINATIONS_TEXT_MODEL,
        // Sem isso, o endpoint às vezes usa um teto baixo por padrão e corta a resposta no meio
        // (finish_reason: "length") sempre que o resumo de pesquisa é um pouco mais longo —
        // confirmado reproduzindo a falha real via curl direto.
        max_tokens: 3000,
        messages: [
          { role: "system", content: SCRIPT_SYSTEM_PROMPT },
          {
            role: "user",
            content: useStrictSchema ? userContent : `${userContent}\n\n${JSON_FALLBACK_INSTRUCTIONS}`,
          },
        ],
        ...(useStrictSchema
          ? {
              response_format: {
                type: "json_schema",
                json_schema: { name: "script", strict: true, schema: SCRIPT_JSON_SCHEMA },
              },
            }
          : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`Pollinations text retornou ${res.status} ao gerar o roteiro.`);
    }

    const data = await res.json();
    const messageContent: string | undefined = data.choices?.[0]?.message?.content;
    if (!messageContent) throw new Error("Pollinations text não retornou conteúdo para o roteiro.");
    return JSON.parse(extractFirstJsonObject(messageContent)) as ScriptResult;
  });
}

const JSON_FALLBACK_INSTRUCTIONS = `Responda APENAS com um objeto JSON válido, sem texto antes ou depois, exatamente neste formato:
{"postCaption": string, "heroImagePrompt": string, "carouselSlides": [{"title": string, "body": string}, ...] (4 a 6 itens), "videoScenes": [{"narration": string, "imagePrompt": string}, ...] (3 a 5 itens)}`;
