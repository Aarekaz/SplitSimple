# SplitSimple Quick Start

SplitSimple is a billsplitting app with a Vercel frontend and a Cloudflare Worker backend for shared bill storage.

## Run locally

```bash
pnpm install
cp .env.example .env.local
cp cloudflare/.dev.vars.example cloudflare/.dev.vars
pnpm backend:db:migrations:apply:local
pnpm dev
```

Run the backend in another terminal:

```bash
pnpm backend:dev
```

## Environment

- `ADMIN_PASSWORD` - admin login for the app
- `CLOUDFLARE_BACKEND_URL` - backend Worker URL
- `BACKEND_SHARED_SECRET` - shared secret between Vercel and the Worker

## Backend scripts

- `pnpm backend:dev`
- `pnpm backend:deploy`
- `pnpm backend:db:migrations:apply:local`
- `pnpm backend:db:migrations:apply:remote`

## Deployment

1. Deploy the Cloudflare backend.
2. Set the backend URL and shared secret in Vercel.
3. Deploy the app on Vercel.
