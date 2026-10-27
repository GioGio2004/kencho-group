# Kencho Group — Revised SEO & Conversion Plan

Version 2.0 · 27 October 2026 · Asia/Tbilisi

Local implementation update, 28 October 2026: the subsequent commercial pass aligns owner-confirmed operations in all locales, adds four category buyer guides and direct service links, unifies contact attribution, provides native no-JavaScript homepage FAQs and fixes sitemap failure responses. See `COMMERCIAL_ALIGNMENT_2026-10-27.md` for the validated scope (94/94 SEO and 69/69 production browser checks). The register below predates that implementation; deployment, field measurements, remaining owner details and CMS timestamp/description work remain outstanding.

Evidence update, 27 October 2026: the user supplied matching Facebook/TikTok profile screenshots, Facebook contact/hours information, a Google business-panel screenshot and a GSC indexing snapshot. Details and unresolved conflicts are recorded in `SEO_OWNER_FACTS.md` and the copy-ready `SEO_CLIENT_CHECKLIST.md`. A live check of `/en` still returned the pre-Sprint-1 H1, heading-boundary defects and interaction-gated initial content; local completion has not been confirmed on production.

Project: https://www.kenchogroup.ge · Next.js 16.2.12 · next-intl 4.x · Convex-backed catalogue

This replaces the supplied master blueprint as the working plan. It incorporates the repository audit, the completed local Sprint 1 work, and a fresh inspection of the remaining implementation. The original `SEO_AUDIT_REPORT.md` remains a dated evidence record, not a description of every current file.

## 1. Objective and current status

The objective is to attract relevant furniture enquiries in Tbilisi and connect those enquiries to qualified projects and completed orders. Preserve Kencho's visual identity while making its services, evidence, and contact routes clear to people and search engines.

### What is already implemented locally

- All eight active homepage components use Georgian, Russian, and English dictionaries.
- The requested localized semantic H1 is present in each locale.
- All three hero hotspot titles/descriptions, four service titles/descriptions, and four homepage FAQ answers remain in initial HTML.
- The audited split-heading and manifesto word boundaries are repaired.
- Nondecorative homepage image alts are localized; decorative images retain empty alts.
- Existing GSAP timelines and the visual interaction pattern were retained.
- The preceding Sprint 1 verification passed the production build, targeted ESLint, 67 SEO checks, and desktop/mobile interaction checks in all three locales.

These changes are in the working tree. This document does not establish that they have been committed, deployed, recrawled, or indexed. Each of those milestones needs its own evidence.

### Baseline: distinguish evidence from supplied figures

| Item | Evidence/status | Interpretation |
| --- | --- | --- |
| 27 sitemap URLs | Prior audit and local verification: five shared route paths plus four published gallery categories, each in three locales | Snapshot; calculate future expectations from published categories |
| One H1, canonical, language alternatives, successful page responses | Prior audit/local checks | Healthy technical foundation; not proof of indexing or rankings |
| 27 GSC clicks, 191 impressions, 14.1% CTR, average position 4.7 over three months | Supplied blueprint; original GSC export not reviewed | Keep as provisional until date range, filters, queries, pages, country, and search type are recorded |
| Ahrefs health 100, DR 0, zero referring domains/organic keywords | Supplied blueprint; export not reviewed | Tool-specific observations; zero tracked keywords does not prove zero Google visibility |
| Facebook/TikTok audience | User screenshots: Facebook header 48K (Google result 48.5K+); TikTok 3,496 followers, 14.2K likes | Rounded/source-specific snapshots received 27 Oct 2026; not a quantified ranking signal |
| GSC page indexing | User screenshot: 21 indexed, 28 not indexed, two reasons; All known pages; updated 23 Oct 2026 | Need reason labels and URL lists; cannot compare totals directly with the 27-URL sitemap |

The old English homepage and missing interactive copy were confirmed defects. They do not, alone, prove the exact cause of all traffic performance or Google's selected canonicals.

## 2. Principles and corrections to the original blueprint

1. **No invented ranking percentages.** Remove the title/H1/URL/lead-copy weight formula. Use accurate titles, clear headings, useful text, sensible links, and sound delivery without assigning unsupported weights.
2. **No mandatory word count.** Write enough to resolve the visitor's practical questions. Google explicitly says it has no preferred word count. [Google: helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
3. **No fixed page-height allocation.** A commercial installation page and a wardrobe page can require different information. Preserve visual hierarchy and adapt section length to the actual material.
4. **No special AI citation promise.** Lists, tables, and accessible disclosures are useful when they make information clearer. They do not guarantee AI citations. Google describes no special optimization or schema requirement for its AI search features. [Google: AI features](https://developers.google.com/search/docs/appearance/ai-features)
5. **No guaranteed indexing or ranking timetable.** Separate engineering completion from crawling, indexing, and performance. Google says crawling can take days to weeks and inclusion is not guaranteed. [Google: recrawling](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
6. **Treat schema as a description of verified facts.** `sameAs` identifies relevant organization profiles; follower counts do not become a documented ranking transfer. [Google: organization markup](https://developers.google.com/search/docs/appearance/structured-data/organization)
7. **Preserve established URLs.** Do not rename gallery URLs or create overlapping service pages simply to insert keywords. Distinct future pages require distinct, useful content and evidence of a separate user need.
8. **Keep essential copy available without interaction.** Persistent HTML is the standard for service descriptions and FAQ answers. Conditional mounting remains appropriate for genuinely transient interface elements.
9. **Preserve the design deliberately.** Retain homepage layout, imagery, typography rules, and normal-motion choreography. New category sections necessarily add page length; design them in the existing visual language. No-JS and reduced-motion modes need useful alternative presentation.
10. **Business outcomes lead reporting.** Track qualified enquiries and won orders. DR is a secondary backlink metric, not a Google score or business outcome. [Ahrefs: backlink metrics](https://ahrefs.com/academy/how-to-use-ahrefs/ahrefs-seo-metrics/backlink)

## 3. Site architecture and search intent

Keep locale prefixes `/ka`, `/ru`, and `/en` and the current canonical host. Georgian is the proposed first editorial review priority; all three versions must be complete before the corresponding multilingual release.

| Existing route, under each locale | Primary purpose | Content focus |
| --- | --- | --- |
| `/` | Introduce Kencho and its service range | Custom furniture in Tbilisi; workshop/process overview; links to each category |
| `/gallery/kitchens` | Help visitors commission a kitchen | Layout and storage needs, project examples, verified material options, quotation and installation process |
| `/gallery/wardrobes-storage` | Help visitors commission wardrobes/storage | Built-in storage, wardrobe layouts, internal fittings, measurement and installation |
| `/gallery/commercial-spaces` | Explain commercial furniture projects | Actual supported business types, scope, drawings, coordination, installation and handover |
| `/gallery/home-interiors` | Explain the remaining supported interior work | Verified wall-panel, shelving, media-wall or other furniture work shown in the portfolio |
| `/gallery` | Browse the full portfolio | Clear category navigation and contextual routes to enquiries |
| `/about` | Establish workshop and team credibility | Real people, facilities, process, project responsibilities |
| `/faq` | Resolve questions across services | Verified ordering, payment, timing and warranty policies |
| `/contact` | Enable contact and visits | Working channels, verified location/visit instructions and hours |

Do not describe bathrooms, hotels, complete turnkey fit-outs, acoustic certification, or specialist moisture resistance unless the owners confirm those capabilities. A photo alone does not establish the performance specification of a material.

Before finalizing keywords, inspect actual Georgian/Russian search results and available GSC query data. Record search intent and competing page formats. Do not invent keyword volumes. Kitchens and wardrobes are a provisional pilot pair, pending the owners' commercial priorities and production capacity.

### Internal linking

- Give each homepage service a real locale-aware link to its relevant category.
- Preserve existing navigation and footer links; add contextual links where they help the next step.
- Link relevant project examples and FAQs back to the corresponding category or enquiry flow.
- Use descriptive, natural anchor text. Avoid repetitive exact-keyword anchors everywhere.
- Keep viewer/query URLs canonical to their category where that remains their intended relationship.

## 4. Facts and content ownership

Complete `SEO_OWNER_FACTS.md` before publishing new factual promises. Unanswered fields remain unknown. Existing claims also need review: translating a claim does not verify it.

Priority confirmations include the physical location's role, hours, coordinates, material/hardware brands, measurement and design policy, production windows, warranty, payment terms, and project provenance.

### One clear owner for each type of content

| Content | Proposed owner | Implementation rule |
| --- | --- | --- |
| Homepage copy | `messages/home-{ka,ru,en}.json` | Keep current namespace and Sprint 1 tests |
| Evergreen service-page H1, metadata, introduction, buyer guide and category FAQs | A dedicated service namespace in `messages/{ka,ru,en}.json`, keyed by the four known slugs | Resolve consistently on the server; use the same approved copy for related metadata/schema |
| Gallery publication, images, image-specific titles/alts/captions, order and actual project facts | Convex records maintained through `kenchogroup-admin` | Frontend dictionary edits do not update those records |
| Business contact details and verified profile URLs | `lib/site.ts` | Shared source for page links and structured data |
| Analytics attribution | Shared attribution/contact helpers plus the chosen lead record system | Do not add competing stores or different source definitions for each CTA |

The four known categories can receive frontend-authored service copy without changing the admin backend. Unknown published categories must keep a sensible CMS-backed fallback. Do not break dynamic publication or turn missing translations into misleading content.

Define how nonblank locale values are selected for grid alts, chapter-cover alts, and OG alts. Currently those paths differ; `pick()` also accepts empty strings as present. Complete CMS translations remain the durable solution.

## 5. Sprint 2: category pages and conversion paths

### Proposed Georgian service headings

These are editorial drafts, not claimed high-volume keyword findings. Review all locale wording for naturalness and layout before release.

| Category | Draft visible H1 |
| --- | --- |
| Kitchens | სამზარეულოს დამზადება შეკვეთით თბილისში |
| Wardrobes | ჩაშენებული კარადები და გარდერობები შეკვეთით თბილისში |
| Commercial | საოფისე და კომერციული ავეჯი შეკვეთით თბილისში |
| Home interiors | ინტერიერის ავეჯი და კედლის პანელები შეკვეთით თბილისში |

Use a concise title describing the same service and brand. Avoid mechanically repeating location and keywords in every heading. Include “prices” only when the page provides genuinely useful pricing information; do not imply a published price list where none exists. Search-result display and title rewriting are separate from local character-budget lint checks.

### Category page composition

1. Existing header and navigation, with a clear service H1, short introduction, and unobtrusive enquiry link.
2. Existing gallery/grid behavior and imagery.
3. A concise buyer guide addressing decisions specific to that category: supported scope, verified material options, process, quotation factors, responsibilities, and installation.
4. Real project evidence when supplied: the brief, what was built, relevant materials and constraints, photographs, and verified outcome. Do not invent dates, costs, neighborhoods, testimonials, or customers.
5. Useful category-specific questions, with answers present in initial HTML and accessible disclosures.
6. A contextual WhatsApp/contact action carrying the relevant category or project context.

There is no compulsory number of FAQs, paragraphs, or words. Keep content distinct between categories. Retain one main H1 as this site's editorial convention and use a logical heading hierarchy.

### Files and acceptance

Primary files: `app/[locale]/(pages)/gallery/[slug]/page.tsx`, `app/_components/CatalogueShell.tsx`, a new server-rendered service-content component if useful, the three main locale dictionaries, and `scripts/verify-seo.mjs`.

- All four known categories render their approved service-specific copy in initial HTML in each locale.
- Titles, H1, descriptions, and contextual links agree with the page's purpose.
- Unknown valid CMS categories retain their existing behavior; missing/unpublished slugs remain 404.
- Catalogue navigation, image viewer, canonical URLs and query handling continue to work.
- New sections fit the existing visual system on desktop and mobile, with no clipping or obstructed CTAs.
- No unsupported commercial promises or repeated filler sections.

## 6. Remaining work register

Status meanings: **Local complete** = implementation previously tested locally; **Ready** = can begin without new business facts; **Needs facts/access** = dependent portion requires named information; **Review first** = reproduce/measure before changing behavior. “Ready” is a work recommendation, not a claim the task is already implemented.

| ID | Priority/status | Issue and concrete next action | Completion evidence |
| --- | --- | --- | --- |
| S1 | Local complete | Preserve homepage localization, persistent panels and word boundaries; audit items 1–5 plus the specified boundary work | Existing build/67-check record; rerun after relevant changes |
| R1 | P0 · Live mismatch confirmed | Live `/en` check on 27 Oct still shows pre-Sprint-1 content/markup. Establish deployment revision and release the intended changes through the normal deployment workflow | Deployed revision/release recorded; three live homepages pass content checks |
| R2 | P0 · Needs facts | Confirm location role, coordinates, hours, materials, lead times, warranty and contract claims already displayed or emitted | Owner confirmation recorded; unsupported claims corrected or omitted consistently |
| R3 | P1 · Ready + editorial facts | Implement four category buyer guides with localized titles/H1s and contextual enquiry paths | Category-specific initial HTML in all locales; desktop/mobile review; no CMS fallback regression |
| R4 | P1 · Ready | Add contextual homepage service-to-category links without changing choreography | Real locale-aware anchors in HTML; targets valid; keyboard and layout checks |
| R5 | P1 · Ready + CMS access | Align nonblank locale selection for photo/cover/OG alts; catalogue missing CMS translations for correction | Correct locale alts across render paths; missing records explicitly reported; no invented descriptions |
| R6 | P1 · Review first | No-JS/slow-JS hero and service visibility, plus complete reduced-motion behavior; audit item 6 | Useful static content and contact/navigation with JS disabled; reduced-motion inspection; normal choreography preserved |
| R7 | P1 · Ready | Sitemap currently catches a Convex listing failure and can return a smaller 200 sitemap. Preserve a valid last-known response if infrastructure supports it, or return a noncacheable temporary error instead | A simulated listing failure cannot publish/cache a truncated successful sitemap; healthy result remains complete |
| R8 | P1 · Ready | Extend metadata/content tests to every published gallery, not just the hardcoded kitchens detail route | Each discovered locale/category tested for status, canonical/alternates, localized copy, alts and schema consistency |
| R9 | P1 · Ready + tracking decisions | Align all live WhatsApp/phone entry points with shared tracking. Homepage manifesto/editorial WhatsApp anchors currently bypass `ContactLink` | Each tested entry point retains its message/context and emits one meaningful contact event; no-JS links still work |
| R10 | P1 · Needs workflow decision | Active contact UI is WhatsApp/phone only; `submitLead` exists without a mounted form. Define actual enquiry logging and sales reconciliation before designing form attribution | Chosen workflow demonstrated from enquiry to qualified lead/order; delivery failures do not appear as success |
| R11 | P2 · Ready + CMS coordination | `lastmod` currently uses gallery creation time; add a real content-modified field in the owning backend when available | Existing gallery edits change the truthful modification date; no guessed timestamps |
| R12 | P2 · Review first | Inspect resolved OG output and file-based precedence. The generated card currently uses English text/alt | Deliberate multilingual or brand-only policy implemented; actual resolved card and alt verified per locale |
| R13 | P2 · Ready + measurement | Replace misleading stock-image error fallbacks with appropriate local project imagery or an honest unavailable-image state; review deprecated `priority` using installed Next.js docs | Broken-image scenario does not misattribute stock work; loading choice documented; no unnecessary preloads |
| R14 | P2 · Review first | Measure actual LCP, CLS, INP and font/image delivery before tuning | Reproducible lab baseline; field data where available; changes improve the measured bottleneck without design regression |
| R15 | P2 · Needs facts/access | Verify official social profiles and Business Profile; align site/contact/schema data; support genuine customer reviews and accurate profile services | Confirmed URLs/data and consistent profiles; no placeholders or fabricated reviews |
| R16 | P2 · Needs assets | Add selected original workshop/project footage and factual project stories where useful | Accessible controls/captions where needed, sensible loading, accurate video metadata, acceptable performance |
| R17 | P2 · Needs research/access | Review local directories and genuine partner/publication opportunities individually | Relevant legitimate listings/mentions, accurate business details, useful referral traffic; no link-volume target used as proof of quality |
| R18 | P3 · Editorial review | Refine catalogue/about/FAQ/contact headings only where clarity improves; no exact-match requirement | Natural localized headings with page-purpose clarity and no hierarchy regressions |
| R19 | Monitoring · Needs access | Establish GSC, enquiry and sales baselines; track release dates and query/page cohorts | Repeatable reports distinguish brand/non-brand, locale, landing page, source, enquiries and orders |

### Decisions deliberately deferred

- Keep current `ka`, `ru`, `en`, and `x-default` language alternatives unless regional targeting has a concrete reason. A change to `ka-GE` is not automatically an improvement.
- Keep existing locale negotiation and permanent retired-route redirects. The old “127 pages” claim needs its source crawl export before it can justify URL changes.
- Do not create a separate wall-panel service route until its need and substantive content are established.
- Do not add fake Product prices, ratings, reviews, or extra duplicate business nodes. Existing FurnitureStore, breadcrumbs and other appropriate markup are a foundation to refine.
- A contact map embed is optional after the real pin is confirmed; the current directions link remains useful.

## 7. Enquiry tracking and sales attribution

### Verified current implementation

- `lib/lead-ref.ts` creates a browser-stored `KG-####` reference and captures the first tagged `ref`/`utm_source`, optionally with campaign.
- `ContactProvider` calls source capture. `ContactLink` appends the reference to WhatsApp messages and tracks contact clicks.
- Some homepage contact links bypass that shared component.
- `app/actions.ts` supports lead delivery to configured Telegram/webhook destinations, but the current active contact panel contains no form and no mounted caller of `submitLead` was found.
- The short random browser reference is not a collision-safe order or accounting identifier.

### Target workflow

1. Agree whether the live enquiry channels remain WhatsApp/phone or also include a form. Do not build a second form solely because a generic SEO plan mentions one.
2. Extend the existing shared attribution helper with a documented record: first landing path, timestamp, source/medium/campaign, available external referrer, and attribution confidence/unknown state. Consider first and latest touch separately. Capture only the fields needed; avoid persisting arbitrary URL parameters that may contain personal data.
3. Preserve direct/unknown attribution honestly. A source cannot always be recovered after browser restrictions, messaging apps, device changes, storage clearing or customer edits.
4. Keep visitor references distinct from durable lead IDs. Generate durable IDs in the chosen lead system; keep older references readable during migration.
5. Track a click as a click. Record a received enquiry, qualification, quotation, won/lost outcome and order value separately.
6. Agree the commission model explicitly: attribution window, repeat customers, existing customers, multiple channels, duplicate leads, cancellations and the event that makes commission payable.
7. Connect accepted leads to the owner's chosen CRM/sheet/admin workflow. Confirm its destination and access before implementing a persistent backend contract.
8. Verify delivery behavior with an agreed test destination. Do not silently send test leads or messages to the owners.

Acceptance: contact links work without JS; tracking cannot block contact; the live JS path records useful source/context; duplicate clicks do not become duplicate orders; the owner can reconcile a real lead with its outcome.

## 8. Business identity, project proof, videos and distribution

### Business identity

`lib/site.ts` already contains Facebook and TikTok URL candidates. `businessLd()` includes non-placeholder profiles in `sameAs`; Instagram/LinkedIn placeholders are filtered out. Verify ownership and exact URLs before calling this complete. Keep the Maps relationship in the existing `hasMap` field and use the actual business pin once confirmed.

Confirm the customer-facing location and Business Profile eligibility/settings with the owners. Keep hours, appointment requirements, service areas and displayed address accurate. Google describes relevance, distance and prominence as central local-ranking considerations, and recommends accurate information and responding to reviews. [Google: local ranking](https://support.google.com/business/answer/7091)

Ask for genuine customer feedback without inventing testimonials or filtering requests to only satisfied customers. Obtain permission before identifying a client or publishing a private interior/project address.

### Project and video evidence

- Obtain original footage from the owners instead of treating downloads from social platforms as the default source.
- Confirm that the footage depicts Kencho's work and that it can be used on the website, including audio.
- Select footage by relevance and clarity, not views alone.
- Use a suitable poster and deliberate loading policy; choose encoding/size from actual duration and quality rather than a universal 5–8 MB target.
- A native player or a lightweight click-to-load third-party player can be appropriate. Measure the result rather than declaring every iframe unacceptable.
- Provide accessible controls and captions/transcripts as appropriate to the content.
- Add accurate `VideoObject` data only for an actual visible video. It does not guarantee video indexing. Google emphasizes watch pages where the video is the main purpose; a supporting clip on a service page may remain primarily conversion evidence. [Google: video guidance](https://developers.google.com/search/docs/appearance/video)

### Distribution and links

Link relevant social posts to the matching localized service page using a consistent UTM convention. Evaluate this as audience distribution and measurable referral traffic; do not claim that generating visits automatically boosts organic rankings.

The supplied directory candidates (`bia.ge`, `yell.ge`, `infoman.ge`, `myhome.ge`, `ss.ge`, `servisebi.ge`) are an unverified research list, not approved placement recommendations. Check current legitimacy, relevance, listing terms, audience and maintenance before spending effort or money.

Prioritize genuine relationships with architects, designers, suppliers and relevant publications when a real project or partnership merits a mention. Avoid buying links for ranking manipulation.

## 9. Verification, release and measurement

### Engineering acceptance

- Read the installed `node_modules/next/dist/docs/` guidance before changing Next.js behavior.
- Run `npm run build`, relevant lint, and `scripts/verify-seo.mjs` against the resulting production server.
- Parse raw HTML as an inert document: serialized RSC/JS message strings must not count as page content.
- Discover published categories dynamically and check each in all locales.
- Preserve exact homepage H1 expectations, all persistent service/hotspot/FAQ text, and intact split-text reading.
- Check service-page copy, localized alts/OG alts, canonical/alternate targets, JSON-LD validity and correspondence to content.
- Cover missing gallery 404s, query canonicals, intended redirects and sitemap outage behavior.
- Use desktop/mobile, keyboard, reduced-motion and no-JS checks where changes affect those behaviors.
- Check runtime/hydration errors and real contact actions. Do not transmit test messages without an agreed test route.

Tests should protect actual behavior and failure cases. Do not claim visual parity based on a build passing alone. Capture representative before/after states when changing layout or animation wrappers.

### Release evidence

Record the deployed revision and date, repeat the relevant checks on production, then use Search Console URL Inspection to inspect representative pages and indexing decisions when account access is available. Use crawled/rendered HTML and canonical information; a sitemap entry or HTTP 200 alone does not prove indexing.

### Reporting cadence, not outcome promises

| Checkpoint | What to review | Decision supported |
| --- | --- | --- |
| Before release | GSC date/filter baseline; working contact paths; performance and content snapshots | Establish a fair comparison and catch broken conversion paths |
| On release | Production HTML, metadata, links, contact behavior, errors and sitemap | Confirm the intended implementation is live |
| Weekly initially | Crawl/indexing status, non-brand query appearances, category impressions/clicks, qualified enquiries | Diagnose discovery, content relevance or conversion problems |
| At roughly 30/60/90 days | Comparable periods by locale/category/source, with seasonality and low sample sizes considered | Refine content and prioritize further work |

The 30/60/90-day checkpoints are review dates, not ranking deadlines. Do not promise a fixed number of impressions, leads or indexed pages by those dates.

Primary outcomes: qualified enquiries, quotes, won orders, attributable revenue and operational capacity. Supporting measures: relevant non-brand impressions/clicks, landing-page engagement/contact actions, Business Profile enquiries, and useful referral traffic. Treat average position and CTR in the context of the query mix; do not infer non-brand success from a small branded sample.

## 10. Execution order and agent brief

### Recommended order

1. Establish deployment status and complete the critical owner facts. Record unknowns explicitly.
2. Start independent technical work: full category verification coverage, sitemap failure handling, contact-entry tracking consistency, and CMS translation-gap inventory.
3. Implement the approved pilot category content and contextual links; then apply the same quality bar to the other two categories.
4. Resolve static/reduced-motion presentation, image fallback accuracy and measured performance issues with visual checks.
5. Apply verified business details, finish attribution/outcome logging, and add real project/video evidence.
6. Release, validate production, inspect indexing, and iterate using query and qualified-enquiry evidence.

Owner-dependent copy and account changes can proceed alongside independent engineering. Missing hours, material brands, or commission terms do not block a sitemap fix or test coverage work.

### Updated implementation prompt

> Read `AGENTS.md`, `MASTER_SEO_BLUEPRINT.md`, `SEO_OWNER_FACTS.md`, and the dated `SEO_AUDIT_REPORT.md`. Inspect the current working tree before editing; Sprint 1 is already implemented locally. Preserve existing user changes and do not redo completed work blindly.
>
> Work through the remaining register in priority order. Distinguish ready engineering tasks from tasks requiring owner facts, account access, backend coordination, or a commercial decision. Complete independent authorized work while those inputs are pending. Do not invent claims, profiles, prices, warranties, reviews, timelines or analytics results.
>
> Read relevant installed Next.js documentation before changing code. Keep normal homepage aesthetics and choreography intact. Integrate new category content into the existing visual language and verify responsive behavior. Keep the current routes, canonical host, locale negotiation and published-category behavior unless a demonstrated problem justifies changing them.
>
> Use one explicit source for evergreen service copy and retain the CMS as owner of gallery records/images. Extend existing contact/attribution helpers instead of creating a competing tracking system. Do not treat contact clicks or client-side reference codes as confirmed sales.
>
> Build and run appropriate automated checks against the production build. Verify raw HTML independently of JS serialization, every published category/locale, relevant failure cases, and any affected browser interactions. Record what was changed, what passed, what still needs input, and whether the work is only local or actually deployed.

## 11. Change record for this revision

- Marked Sprint 1 as locally complete and kept deployment/indexing as separate evidence requirements.
- Removed unsupported ranking weights, mandatory word counts, fixed layout percentages and guaranteed results/timelines.
- Corrected the claim that all social links were placeholders.
- Corrected the assumption that a lead form is currently mounted.
- Added the two homepage WhatsApp attribution bypasses and the limitation of short browser reference codes.
- Defined frontend/CMS ownership and added gallery/cover/OG translation consistency work.
- Added sitemap outage behavior, actual modification dates, no-JS/reduced-motion review, image fallback accuracy and measured performance work from the original audit.
- Replaced automatic video-indexing, follower-authority and traffic-signal promises with testable implementation and distribution goals.
- Added owner fact collection, a prioritized remaining-work register, release evidence and a business-focused measurement plan.

Document status: revised plan and issue triage completed. Remaining register entries are not marked implemented by the creation of this document.
