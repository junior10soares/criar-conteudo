const DEFAULT_DELAYS_MS = [2000, 5000];

/** Roda `fn`, tentando de novo (com espera) se ela rejeitar, antes de desistir e propagar o erro.
 *  Usado nas chamadas à Pollinations.ai — serviço gratuito, sem SLA, com falhas 5xx ocasionais.
 *  `fn` recebe o índice da tentativa (0-based), útil pra variar a estratégia entre tentativas
 *  (ex.: cair pra um modo mais simples se a tentativa "ideal" estiver falhando). */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  delaysMs: number[] = DEFAULT_DELAYS_MS
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt < delaysMs.length) {
        await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
      }
    }
  }
  throw lastError;
}
