# worker_one

A simple [Cloudflare Worker](https://workers.cloudflare.com/) that handles HTTP requests.

## Endpoints

- `GET /` — Returns a plain-text greeting
- `GET /health` — Returns `{"status":"ok"}` as JSON
- Any other path returns a `404 Not Found`

## Development

```bash
npm install
npm run dev   # start local dev server via Wrangler
```

## Testing

```bash
npm test
```

## Deploy

```bash
npm run deploy
```
