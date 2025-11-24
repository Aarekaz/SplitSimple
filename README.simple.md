# SplitSimple — Quick Start

SplitSimple is a modern billsplitting tool built with Next.js, TypeScript, Tailwind, and Redis. It keeps everyone in sync while you divide receipts line-by-line.

## Features

- Per-item splitting (even, shares, percent, exact) with penny-safe math
- Tax/tip/discount allocation (proportional or even)
- Auto-save to local storage + optional cloud share links (Redis)
- Undo/redo history, keyboard shortcuts, and CSV/export summaries
- Responsive UI with a dedicated mobile workflow

## Requirements

- Node.js 18+
- pnpm 9+
- Redis URL (for sharing) stored in `.env.local` as `REDIS_URL`

## Develop

```bash
pnpm install
pnpm dev
# open http://localhost:3000
```

Helpful scripts:

- `pnpm lint` – ESLint/Next checks
- `pnpm typecheck` – TypeScript
- `pnpm test` – Jest suite (`pnpm test:coverage` for coverage)
- `pnpm dev:clean` – Clear `.next` cache before starting dev

## Environment

```ini
REDIS_URL="redis://..."
NEXT_PUBLIC_POSTHOG_KEY="optional analytics"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
OCR_PROVIDER="google" # or openai/anthropic
```

If OCR keys are missing the app falls back to mock data.

## Deploy

1. Provision Redis (Vercel KV or any managed Redis)
2. Set env vars above
3. `pnpm build && pnpm start` (or deploy via Vercel/GitHub Actions)

## Project Structure

- `components/` – UI (desktop + mobile-specific views)
- `contexts/` – `BillContext` reducer/history, sync helpers
- `lib/` – calculations, validation, sharing/export helpers
- `app/api/` – Next.js route handlers for sharing
- `tests/` – Jest helpers + MSW mocks

## CI

`.github/workflows/test.yml` runs lint, typecheck, unit tests, and Codecov upload; integration tests spin up Redis and run targeted suites.

## License

© SplitSimple team — redistribute under the repository’s LICENSE.
