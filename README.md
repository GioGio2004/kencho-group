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
npm run verify:request
```

`verify:launch` exercises handlers using controlled database/provider adapters. `verify:chat` tests the browser UI with mocked chat/session responses and does not send project requests. It defaults to port 3000; override `BASE` to test another server or ngrok URL. It requires installed Chrome.

The broader browser suites are `verify:landing` (`LANDING_BASE`) and `verify:seo` (`SEO_BASE`), defaulting to port 3100. Prefer a production server for these checks so development hot reloads do not interrupt navigation.

Production: `npm run build`, then `npm start`. Configure the same server-only secrets in the hosting environment; `.env.local` is not deployed or committed.

## Project requests

`ProjectRequestLink` routes to the dedicated `/contact` page. Requests can be sent only there or from the editable review inside the existing AI window; there is no global contact sheet or extra form sidebar. Both use `ProjectRequestForm`, with submission state in `useProjectRequestForm` and upload/session recovery in `project-request-upload`. The AI progressively extracts explicit conversation facts, preserves edits and requires the visitor to review and submit; it never sends a request autonomously. Only the footer uses `PartnerContactLink` for direct partner contact.

Contact has a sticky introduction and accessible banner carousel beside the form on desktop, stacking on mobile. Supplied banners are named WebP files in `public/banners`. Slideshow controls support pause/manual navigation and respect reduced motion. `npm run verify:contact` checks both submission paths with intercepted request services; it never creates real leads or sends email.

Attachments are uploaded through the server to private ImageKit storage, then claimed by the saved Convex request. Save retries retain the request ID and successful attachment IDs. `verify:request` checks expired upload sessions, failed-save retries, and preview cleanup at mobile and desktop sizes with all request endpoints mocked.

The sibling admin owns the private inbox and notification jobs. Its development recipient is configured as `giokhvichia69@gmail.com`; actual email delivery still needs Resend settings. Production configuration and deployment are separate from this development setting. See the admin's `LAUNCH_SETUP.md` for the remaining hosting, authentication and provider configuration.

Production branches, domains and exact environment-variable placement are documented in [PRODUCTION_RELEASE.md](./PRODUCTION_RELEASE.md).
