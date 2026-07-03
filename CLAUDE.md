@AGENTS.md

# Criar Conteúdo

Gerador de conteúdo para redes sociais (texto, imagem, carrossel, vídeo narrado) para quem tem
vergonha de aparecer. Você digita um assunto, o app pesquisa informação atualizada na web, gera
um roteiro com IA e produz os 4 formatos prontos para download — sem publicação automática.

## Princípios inegociáveis

- **Roda local** (`npm run dev`/`start`), não é deployado na Vercel: o pipeline usa ffmpeg e leva
  minutos, o que estoura os limites de função serverless. Não reintroduzir deploy na Vercel a
  menos que as etapas pesadas sejam movidas para outro lugar.
- **100% gratuito por padrão**: roteiro/copy usa o modelo aberto gratuito da Pollinations.ai
  (sem chave). Pesquisa (Tavily, funciona sem chave), imagem (Pollinations), narração (Edge TTS) e
  vídeo (ffmpeg) também não têm custo nem exigem cartão. `ANTHROPIC_API_KEY` é um upgrade
  opcional — só é usada se `SCRIPT_PROVIDER=anthropic` também estiver setado
  (`lib/ai/generateScript.ts`). Essa dupla trava é proposital: evita usar sem querer uma
  `ANTHROPIC_API_KEY` que já exista no shell do usuário por outro motivo (ex. Claude Code) —
  isso já causou um erro real de "credit balance too low" numa sessão de teste.
- **Avatar = "faceless" por padrão**: o vídeo usa narração + legendas queimadas + imagens de fundo
  geradas, sem lip-sync real. Dois mecanismos opcionais de avatar existem, cada um best-effort e
  independente do outro — nenhum é o único caminho para ter vídeo:
  - **Fase 4**: lip-sync fotorrealista via Hugging Face Space público (`HF_AVATAR_SPACE`) — pode
    falhar/cair a qualquer momento.
  - **Fase 5**: overlay PiP de um avatar 3D (VRM) com lip-sync real via Rhubarb Lip Sync, ver
    seção própria abaixo. Gate é só a presença de `assets/avatar/avatar.vrm` — sem o arquivo, a
    etapa "avatar" do pipeline não faz nada.
- **Fila em processo único**: `lib/jobs/queue.ts` processa 1 job por vez num worker singleton
  (guardado via `globalThis` pra sobreviver ao Fast Refresh do Next em dev). Não adicionar uma lib
  de fila externa — é uso single-user, concorrência 1 é intencional.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui (estilo `base-nova`, sobre
`@base-ui/react`) + `motion` para animações + `better-sqlite3` para o histórico de jobs.

| Etapa | Ferramenta | Chave de API? |
|---|---|---|
| Pesquisa atualizada | `@tavily/core` | opcional (funciona sem chave, limitado; com chave = 1000 buscas grátis/mês) |
| Roteiro/copy | Pollinations.ai (`text.pollinations.ai/openai`, modelo `openai`/GPT-OSS-20B) por padrão; `@anthropic-ai/sdk` (`claude-sonnet-5`) só se `SCRIPT_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` | não (opcional para upgrade) |
| Imagem | `image.pollinations.ai` (fetch direto, sem SDK) | não |
| Carrossel | `satori` + `@resvg/resvg-js`, fontes Poppins em `assets/fonts/` | não |
| Narração | `node-edge-tts` (vozes `pt-BR-FranciscaNeural`/`pt-BR-AntonioNeural`) | não |
| Legendas | `.ass` gerado a partir do timing por palavra do edge-tts, queimado via `ffmpeg subtitles` | não |
| Vídeo | `ffmpeg-static` + `child_process` (sem `fluent-ffmpeg`) | não |
| Avatar realista (opcional) | `@gradio/client` chamando um HF Space configurado em `HF_AVATAR_SPACE` | não (Space público) |
| Avatar 3D com lip-sync (opcional) | Rhubarb Lip Sync (vendorizado em `vendor/rhubarb/`) + `.vrm` (VRoid Studio) renderizado via Playwright/Chromium + `@pixiv/three-vrm`, compositado no vídeo via ffmpeg | não |

## Pipeline (`lib/jobs/pipeline.ts`)

`research → script → images → carousel → narration → video → avatar`, com status gravado no
sqlite (`data/app.db`) entre cada estágio. Cada estágio vive em `lib/jobs/stages/0N-*.ts`. Saída
de cada job fica em `data/outputs/<jobId>/` (gitignored).

Detalhe importante: a duração de cada cena de vídeo vem da duração **real** do mp3 gerado
(`lib/video/probe.ts`, via stderr do ffmpeg), não da estimativa por cues do edge-tts — o último
cue de palavra não cobre o silêncio final do áudio, e usar a estimativa causava imagem/legenda
dessincronizadas do áudio.

O vídeo é renderizado em 3 passos (`lib/video/render.ts`): 1) um clipe Ken Burns mudo por cena,
hard-trimmed via `-t` de saída (não via `zoompan.d` sozinho — isso também causava dessincronia);
2) concat dos clipes mudos; 3) mux com o áudio concatenado + legendas queimadas.

### Avatar 3D (VRM) com lip-sync — `lib/jobs/stages/07-avatar.ts` + `lib/video/avatar/`

Etapa opcional que roda depois do vídeo faceless já estar pronto, só se
`assets/avatar/avatar.vrm` existir (gitignored, ver `assets/avatar/README.md` — o usuário exporta
o próprio avatar no VRoid Studio olhando uma foto de referência; o Ready Player Me sunsetou em
31/01/2026 e não é mais uma opção). Fluxo: narração mp3 → wav (`audioConvert.ts`) → Rhubarb Lip
Sync com `--recognizer phonetic` (obrigatório pra pt-BR, `rhubarb.ts`) → mapeia os 9 mouth shapes
do Rhubarb pros 5 visemes do VRM (`visemeMap.ts`) → renderiza o avatar frame a frame (30fps,
determinístico, não é captura em tempo real) num headless Chromium via Playwright, fundo verde
puro pra chroma key (`vrmRenderer.ts`, bundle de three.js + `@pixiv/three-vrm` em
`renderer/dist/bundle.js`, buildado via `npm run build:avatar-renderer`) → composita por cima do
`video.mp4` com `colorkey`+`overlay` no canto inferior direito (`compositeAvatarOverlay` em
`render.ts`).

Tudo dentro de um único try/catch: sem o `.vrm`, sem o binário do Rhubarb (`vendor/rhubarb/`,
vendorizado via `npm run setup:rhubarb`, **não** o pacote npm homônimo — é um wrapper de terceiro
não confiável), ou qualquer falha no meio do caminho, o `video.mp4` já produzido fica intacto e
sai sem avatar — nunca quebra o job.

Setup manual único (não roda em `postinstall`): `npm run setup:rhubarb`, `npx playwright install
chromium`, e colocar `assets/avatar/avatar.vrm`.

## Roadmap

- [x] Fase 0 — Setup (Next.js, Tailwind, shadcn/ui, schema sqlite, `.env.example`)
- [x] Fase 1 — Pipeline ponta a ponta (todos os 4 formatos, versão simples)
- [x] Fase 2 — Imagem por cena + carrossel com fundo fotográfico
- [x] Fase 3 — Legendas sincronizadas + vídeo faceless multi-cena
- [x] Fase 4 — Avatar realista opcional via Hugging Face Space (best-effort + fallback)
- [x] Fase 5 — Avatar 3D (VRM) com lip-sync real via Rhubarb, overlay PiP (best-effort + fallback)
- [ ] Fase 6 — Polish: histórico/retry por estágio, "baixar tudo" em zip, SSE em vez de polling

## Variáveis de ambiente

Ver `.env.example`. `TAVILY_API_KEY` e `HF_AVATAR_SPACE` são opcionais. `ANTHROPIC_API_KEY` só é
usada se `SCRIPT_PROVIDER=anthropic` também estiver setado, e precisa ter créditos na conta
console.anthropic.com (não é o mesmo login/sessão do Claude Code).
