# Criar Conteúdo

> Gerador de conteúdo para redes sociais (texto, imagem, carrossel e vídeo narrado com legendas
> sincronizadas) para quem tem vergonha de aparecer — 100% gratuito, roda local.

Você digita um assunto, o app pesquisa informação atualizada na web, gera um roteiro com IA e
produz os 4 formatos prontos para download (Instagram/Facebook) — sem publicação automática, sem
avatar real, sem custo.

## Conceito

- Pesquisa automática (Tavily) traz informação atualizada sobre o assunto antes de escrever
  qualquer coisa, pra evitar conteúdo genérico ou desatualizado.
- Um roteiro único (legenda, prompt de imagem, slides de carrossel, cenas de vídeo narrado) é
  gerado uma vez e reaproveitado nos 4 formatos, mantendo consistência entre eles.
- Vídeo é renderizado localmente com `ffmpeg`: efeito Ken Burns por cena, legendas queimadas
  sincronizadas por palavra (timing real do TTS), sem precisar aparecer ou gravar nada.
- Cada job roda em fila própria (1 por vez) com histórico e progresso por etapa no dashboard.

## Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript + Tailwind CSS + shadcn/ui + `motion`
- [Pollinations.ai](https://pollinations.ai/) — roteiro/copy (modelo aberto) e imagens, sem chave
- [Tavily](https://tavily.com/) — pesquisa web atualizada (funciona sem chave, limitado)
- `node-edge-tts` — narração (vozes pt-BR, timing por palavra pra legenda sincronizada)
- `ffmpeg-static` — renderização de vídeo (Ken Burns + legenda queimada)
- `satori` + `@resvg/resvg-js` — carrossel com fundo fotográfico
- `better-sqlite3` — fila e histórico de jobs

Tudo roda **localmente** (`npm run dev`/`start`) — não é deployado na Vercel, porque o pipeline usa
`ffmpeg` e leva minutos, o que estoura os limites de função serverless.

## 100% gratuito por padrão

Roteiro, pesquisa, imagem, narração e vídeo não têm custo nem exigem cartão. Um modelo pago da
Anthropic é um upgrade opcional (melhor qualidade de roteiro), só é usado se configurado
explicitamente — nunca por padrão.

## Como rodar

```bash
npm install
cp .env.example .env   # todas as chaves são opcionais
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Roadmap (fases de construção)

- [x] **Fase 0** — Setup (Next.js, Tailwind, shadcn/ui, schema sqlite)
- [x] **Fase 1** — Pipeline ponta a ponta (4 formatos, versão simples)
- [x] **Fase 2** — Imagem por cena + carrossel com fundo fotográfico
- [x] **Fase 3** — Legendas sincronizadas + vídeo faceless multi-cena
- [x] **Fase 4** — Avatar realista opcional via Hugging Face Space (best-effort + fallback)
- [x] **Fase 5** — Avatar 3D (VRM) com lip-sync real via Rhubarb, overlay opcional (best-effort)
- [ ] **Fase 6** — Polish: histórico/retry por estágio, "baixar tudo" em zip, SSE em vez de polling

Detalhes de cada fase no histórico de commits do projeto.
