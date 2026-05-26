# SplitSimple

SplitSimple is a billsplitting app with a Vercel-hosted Next.js frontend and a Cloudflare Worker backend for shared bill persistence.

## Architecture

- Frontend: Next.js on Vercel
- Shared bill backend: Cloudflare Worker
- Database: Cloudflare D1
- Local drafts: browser storage

## Getting Started

```bash
pnpm install
cp .env.example .env.local
cp cloudflare/.dev.vars.example cloudflare/.dev.vars
```

Set these values before running the app:

- `ADMIN_PASSWORD`
- `CLOUDFLARE_BACKEND_URL`
- `BACKEND_SHARED_SECRET`

Then start the frontend and backend in separate terminals:

```bash
pnpm dev
pnpm backend:dev
```

## Scripts

- `pnpm dev` - Next.js dev server
- `pnpm build` - Build the frontend
- `pnpm start` - Start the Next.js production server
- `pnpm backend:dev` - Run the Cloudflare backend locally
- `pnpm backend:deploy` - Deploy the Cloudflare backend
- `pnpm backend:db:migrations:apply:local` - Apply D1 migrations locally
- `pnpm backend:db:migrations:apply:remote` - Apply D1 migrations to remote D1
- `pnpm lint` - ESLint
- `pnpm typecheck` - TypeScript
- `pnpm test` - Jest

## Deploy

1. Deploy the Cloudflare Worker backend.
2. Set `CLOUDFLARE_BACKEND_URL` and `BACKEND_SHARED_SECRET` in Vercel.
3. Set the same `BACKEND_SHARED_SECRET` in `cloudflare/.dev.vars` for local development and in the Worker environment for production.
4. Deploy the Next.js app on Vercel as usual.

## Notes

- Old Redis storage is not used anymore.
- Shared bills live in D1 through the backend worker.
- The frontend talks to the backend through the app's API routes, not directly from the browser.
