# Eva Create

Multiplicador de criativos em vídeo — Gancho, Corpo e CTA a partir de um único arquivo fonte.

## Como rodar localmente

### Pré-requisitos
- Node.js 18+ (https://nodejs.org)
- npm ou yarn

### 1. Instalar dependências

```bash
npm install
```

> Se der erro no @lovable.dev: o package.json já foi limpo, não há mais essa dependência.

### 2. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:5173

### ⚠️ Requisito crítico: headers CORS para FFmpeg.wasm

O FFmpeg.wasm precisa de dois headers HTTP para funcionar no browser:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

O `vite.config.ts` já configura isso automaticamente em desenvolvimento.

**Para deploy (Vercel, Netlify, etc.)** você precisa adicionar esses headers manualmente:

#### Vercel — arquivo `vercel.json` na raiz:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

#### Netlify — arquivo `netlify.toml` na raiz:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

### 3. Build para produção

```bash
npm run build
```

Os arquivos ficam em `dist/`.

## Funcionalidades

- Upload de .mp4, .mov, .webm via drag & drop
- Importação de YouTube via link (usa cobalt.tools como proxy)
- Detecção de cortes simulada por IA
- Timeline interativa com marcadores arrastáveis
- Classificação de segmentos: **Gancho**, **Corpo**, **CTA**
- Corte real de vídeo no browser via FFmpeg.wasm (sem backend)
- Download individual ou em ZIP
- 100% local — nenhum vídeo sai do dispositivo

## Estrutura

```
src/
  assets/        → logo da Eva
  components/    → AppSidebar, Timeline, etc.
  lib/           → store (Zustand), video-utils (FFmpeg), utils
  routes/        → páginas (index, projetos, uploads, exportacoes)
  styles.css     → tema dark + tokens
```
