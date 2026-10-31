# Production release — 1 November 2026

Two Git repositories, two Vercel projects, one existing production Convex backend:

| Application | Repository | Production branch | Domain |
| --- | --- | --- | --- |
| Storefront | `GioGio2004/kencho-group` | `polish-pass` | `https://www.kenchogroup.ge` |
| Admin and Convex source | `GioGio2004/kenchogroup-admin` | `main` | `https://admin.kenchogroup.ge` |

Production Convex: `https://perfect-corgi-762.convex.cloud` ([dashboard](https://dashboard.convex.dev/d/perfect-corgi-762)). Development is `fleet-bee-669`; do not copy its deployment URL or Clerk user IDs into production. Keep the existing Convex project and published gallery data. Deploying source does not copy development records/settings into production. Do not run seed/reset/import scripts against production as part of this release.

## 1. Domains and Clerk production instance

1. Preserve `www.kenchogroup.ge` on the storefront Vercel project. Redirect the bare domain to `www`, matching the site's canonical URLs. Add `admin.kenchogroup.ge` to the new admin Vercel project.
2. Use the existing Clerk application's **Production** instance. Complete its domain setup for the owned `kenchogroup.ge` domain and the admin application subdomain as directed by Clerk. Copy the exact DNS records from the Clerk and Vercel dashboards; they serve different hostnames. Do not replace existing Resend email DNS records.
3. Root-domain Clerk configuration supports subdomains, so the admin can run at `admin.kenchogroup.ge`. Copy the resulting production Frontend API URL for the issuer variable below; do not guess it from the admin URL. A Vercel `*.vercel.app` address is suitable for testing with development Clerk keys, not this production Clerk setup.
4. Activate the **Convex integration** in the Production Clerk instance. The app supports its session tokens with `aud: convex`. If using the legacy integration instead, create the JWT template named exactly `convex`, with audience `convex` and the name/email/picture claims, matching development. Missing production integration/template causes authentication failure even when the production keys are correct.
5. Create/locate your owner user in the **Production** instance and copy its `user_...` ID. The development user ID is not a substitute, even when the email is identical. Use that production ID in the Convex allowlist.
6. Production keys belong in Vercel Production; keep development keys in local/preview environments. The storefront has no Clerk login and needs no Clerk keys.

## 2. Convex Production environment variables

Select **Production / perfect-corgi-762**, then Settings → Environment Variables. Set these before the first backend release:

| Variable | Value |
| --- | --- |
| `CLERK_JWT_ISSUER_DOMAIN` | Exact HTTPS Frontend API URL from Clerk Production. |
| `KENCHO_ADMIN_USER_IDS` | Your Production Clerk `user_...` ID; comma-separated if more than one owner. |
| `LEAD_INGEST_SECRET` | A new random production secret, at least 32 characters. Use the exact same value on storefront Vercel. |
| `LEAD_NOTIFY_EMAIL` | `giokhvichia69@gmail.com` |
| `RESEND_API_KEY` | Your Resend sending key. |
| `RESEND_FROM_EMAIL` | `Kencho Group <requests@kenchogroup.ge>`; retain Resend's verified domain/DNS. |
| `ADMIN_SITE_URL` | `https://admin.kenchogroup.ge` |
| `IMAGE_KIT_SECRET_KEY` | ImageKit private API key for abandoned-upload cleanup, from the same account used by both apps. |
| `CLERK_WEBHOOK_SECRET` | Production webhook signing secret if enabling the user-sync webhook below. |

Do not put `CONVEX_DEPLOY_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `CLERK_SECRET_KEY`, Gemini keys or the ImageKit URL endpoint here; the backend does not read those values. Convex's own environment is separate from Vercel and `.env.local`.

## 3. Admin Vercel project

Import `GioGio2004/kenchogroup-admin`, use **Next.js**, repository root, production branch **main**. Set the following variables for **Production**:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | `https://perfect-corgi-762.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production Clerk `pk_live_...` |
| `CLERK_SECRET_KEY` | Matching Production Clerk `sk_live_...` |
| `IMAGE_KIT_SECRET_KEY` | Same ImageKit private key as the storefront/backend. |
| `IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/ieieczbex` |
| `NEXT_PUBLIC_STOREFRONT_URL` | `https://www.kenchogroup.ge` |
| `CONVEX_DEPLOY_KEY` | Production deploy key generated for **perfect-corgi-762** with deployment permission. Keep it scoped to Vercel Production. |

Override the admin **Build Command** with:

```sh
npx convex deploy --cmd "npm run build" --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

This pipeline builds the admin and releases its Convex schema/functions/indexes to the deployment selected by the key. Only this repository deploys Convex. Do not set `CONVEX_DEPLOYMENT=dev:...` in Vercel. Do not give preview builds a production deploy key; use separate development/preview settings and the normal `npm run build` when not deploying their own backend.

If you choose to deploy Convex manually from the admin directory instead, verify the CLI-selected target before running `npx convex deploy`, then use `npm run build` for Vercel. Do not create another Convex project.

## 4. Storefront Vercel project

Keep the existing `kencho-group` project, production branch **polish-pass**, repository root, Next.js, Build Command `npm run build`. No Convex deploy command or deploy key is needed here.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | `https://perfect-corgi-762.convex.cloud` — identical to the admin. |
| `LEAD_INGEST_SECRET` | Exact production secret set on Convex. |
| `IMAGE_KIT_SECRET_KEY` | Same ImageKit private key. |
| `GEMINI_API_KEY` | Existing Gemini API key, server-only. |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite`, or the existing enabled model. |
| `SITE_ORIGIN` | `https://www.kenchogroup.ge` |

Optional existing integration values: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (or server-only `GOOGLE_SITE_VERIFICATION`) and `NEXT_PUBLIC_BUILD_TIME`. Preserve any currently configured values. `TRUSTED_IP_HEADER` is unnecessary on Vercel; its trusted IP header is handled automatically. Prefer the canonical `GEMINI_API_KEY` spelling; the legacy `GEMNI_API_KEY` remains supported but is unnecessary.

The storefront needs neither Resend nor Clerk keys. ImageKit's public key is not used by this server-upload flow. Never prefix a private key, ingest secret or deploy key with `NEXT_PUBLIC_`.

## 5. Release order and checks

1. Prepare Clerk Production, DNS, your production owner ID, and all Convex production variables.
2. Create/configure/deploy the admin Vercel project with its production deploy key and build command. Confirm the Convex deployment log reports **perfect-corgi-762** and includes `launch`, notification jobs and cron functions.
3. Open `https://admin.kenchogroup.ge`, sign in as the allowlisted owner, and verify galleries and requests load. Existing gallery records/files must remain present. Production seed/import is not part of this release.
4. Configure the storefront variables and deploy/redeploy the latest **polish-pass** commit after the backend is ready. A Git push may trigger the storefront automatically before these settings exist; redeploy after configuration. Public environment-variable changes also need a fresh build.
5. Enable Clerk user-sync if desired: add `https://perfect-corgi-762.convex.site/clerk-users-webhook` in Clerk **Production**, select `user.created`, `user.updated`, `user.deleted`, and store its signing secret as `CLERK_WEBHOOK_SECRET` on **Convex Production**, not Vercel. The app also synchronizes the signed-in user from the validated token, so this webhook is not required for the first owner login.
6. Submit one clearly labeled test request using an email you control and a harmless reference image. Verify the admin record, private thumbnail/download, owner notification to Gmail, customer confirmation, and one explicit follow-up. Replies to customer mail must reach the owner's Gmail. Check Resend for delivered/bounced state; admin “Accepted” means only provider acceptance. Also confirm the AI prefill/review submits through the same flow.

Local `.env.local` files are ignored and do not reach Vercel or Convex automatically. Settings in one provider's dashboard do not automatically configure the other provider. Re-deploy the appropriate app/backend after changing authentication/public build configuration.

Existing authentication, allowlist, private downloads and rate limits remain enabled. Additional hardening is deferred. Before accepting private customer files, confirm ImageKit's named-transformation policy does not expose them: unsigned/expired/invalid original URLs were checked locally, but the account-level named-transformation policy remains unverified. Do not disable privacy/authentication to get a deployment through.

## References

- [Clerk production deployment](https://clerk.com/docs/guides/development/deployment/production)
- [Clerk on Vercel and custom-domain requirement](https://clerk.com/docs/guides/development/deployment/vercel)
- [Convex with Clerk](https://docs.convex.dev/auth/clerk)
- [Convex on Vercel](https://docs.convex.dev/production/hosting/vercel)
- [ImageKit private-file delivery](https://imagekit.io/docs/media-delivery-basic-security)
