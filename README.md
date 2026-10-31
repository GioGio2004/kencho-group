# Kencho Group website

Next.js 16 storefront in Georgian, Russian and English. Gallery data and project requests use the Convex deployment managed by the sibling `kenchogroup-admin` app.

## Local setup

Install dependencies with `npm ci`. Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_CONVEX_URL`: the admin app's deployment URL.
- `LEAD_INGEST_SECRET`: at least 32 random characters, identical to the Convex deployment's `LEAD_INGEST_SECRET`. Required for sessions, chat rate limits and project requests. Keep it server-only and out of Git.
- `GEMINI_API_KEY`: Gemini API key for AI responses. The older `GEMNI_API_KEY` spelling remains supported. Without a key the route returns limited preset information, rather than an AI-generated answer.
- `IMAGE_KIT_SECRET_KEY`: private ImageKit key for project attachments.

Run `npm run dev`, then open `http://localhost:3000`.

## Testing through ngrok

Run `ngrok http 3000` while the development server is running. Standard ngrok hostnames are allowed by `allowedDevOrigins`; this is needed for Next.js 16's development JavaScript and HMR to load through the tunnel. After changing the configuration, refresh an already-open browser tab.

The API accepts HTTPS development tunnel origins only when their hostname matches the incoming host or forwarded host. Production keeps its origin restriction; set `SITE_ORIGIN` to the exact public origin, for example `https://www.kenchogroup.ge`, especially when a proxy terminates HTTPS.

Set `TRUSTED_IP_HEADER=x-forwarded-for` only behind a proxy such as ngrok that supplies the client address. Production uses Vercel's IP header automatically on Vercel; other deployments need a trusted proxy header. Without one, the application uses a shared conservative rate limit. Never blindly trust client-supplied IPs on an origin directly exposed to the internet.

## Checks

```sh
npm run lint
npx tsc --noEmit
npm run build
npm run verify:launch
npm run verify:commercial
npm run verify:chat
```

`verify:launch` exercises handlers using controlled database/provider adapters. `verify:chat` tests the browser UI with mocked chat/session responses and does not send project requests. It defaults to port 3000; override `BASE` to test another server or ngrok URL. It requires installed Chrome.

The broader browser suites are `verify:landing` (`LANDING_BASE`) and `verify:seo` (`SEO_BASE`), defaulting to port 3100. Prefer a production server for these checks so development hot reloads do not interrupt navigation.

Production: `npm run build`, then `npm start`. Configure the same server-only secrets in the hosting environment; `.env.local` is not deployed or committed.
