# SplitSimple — Quick Start

SplitSimple is a modern billsplitting tool built with Next.js, TypeScript, Tailwind, and Cloudflare D1. It keeps everyone in sync while you divide receipts line-by-line.

## Features

- Per-item splitting (even, shares, percent, exact) with penny-safe math
- Tax/tip/discount allocation (proportional or even)
- Auto-save to local storage + optional cloud share links (D1)
- Undo/redo history, keyboard shortcuts, and CSV/export summaries
- Responsive UI with a dedicated mobile workflow

## Requirements

- Node.js 18+
- pnpm 9+
- Cloudflare D1 local binding configured by `wrangler.jsonc`

## Develop

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrations:apply:local
pnpm dev
# open http://localhost:3000
```

Helpful scripts:

- `pnpm lint` – ESLint/Next checks
- `pnpm typecheck` – TypeScript
- `pnpm test` – Jest suite (`pnpm test:coverage` for coverage)
- `pnpm preview` – Build and preview in the Cloudflare Workers runtime
- `pnpm deploy` – Build and deploy to Cloudflare Workers
- `pnpm db:migrations:apply:remote` – Apply D1 migrations to production
- `pnpm dev:clean` – Clear `.next` cache before starting dev

## Environment

```ini
NEXT_PUBLIC_POSTHOG_KEY="optional analytics"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
OCR_PROVIDER="google" # or openai/anthropic
GOOGLE_GENERATIVE_AI_API_KEY="optional receipt image scanning"
```

If OCR keys are missing, receipt image scanning returns a configuration error. Paste-text receipt import still works without OCR keys.

## Deploy

1. `pnpm wrangler login`
2. `pnpm wrangler d1 create splitsimple`
3. Copy the returned `database_id` into `wrangler.jsonc`
4. `pnpm db:migrations:apply:remote`
5. `pnpm deploy`

## Project Structure

- `components/` – UI (desktop + mobile-specific views)
- `contexts/` – `BillContext` reducer/history, sync helpers
- `lib/` – calculations, validation, sharing/export helpers
- `app/api/` – Next.js route handlers for sharing
- `tests/` – Jest helpers and shared test utilities

## CI

`.github/workflows/test.yml` runs lint, typecheck, unit tests, and Codecov upload.

## License

© SplitSimple team — redistribute under the repository’s LICENSE.
