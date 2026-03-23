# Stripe Worker + Frontend split

This repository is now prepared to be split into two deployments:

1. **Frontend repository** (deploy to GitHub Pages)
2. **Worker repository** (deploy to Cloudflare Workers)

## What changed

- `src/worker.js` now serves API endpoints only (`/config`, `/create-payment-intent`).
- `wrangler.toml` no longer binds static assets.
- Frontend files were intentionally excluded so this repository can be deployed directly as a Worker-only service.

## Worker repository (this repository)

### Setup

```bash
npm install
cp .env.example .dev.vars
```

Set keys in `.dev.vars`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Run locally

```bash
npm start
```

### Deploy to Cloudflare

```bash
npm run deploy
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_PUBLISHABLE_KEY
```

## Frontend repository (GitHub Pages)

Use the frontend files from the source repository (`panndabea/Stripe_tester`) and set:

```html
window.STRIPE_API_BASE = 'https://YOUR-WORKER-DOMAIN.workers.dev';
```
