# Kencho greeting · 11 October 2026

The opening greeting is a separate screen above the application. The original KENCHO wordmark gains a fine outline, fills with ivory, and settles above a copper hairline and the spaced GROUP lettering. A charcoal curtain lifts into the existing photographic arrival sequence. The normal animation lasts about 2.5 seconds, with small bounded waits for fonts and the first photograph.

It runs once per browser session. `?intro=1` replays it for review. The screen has a localized Skip intro control, supports Escape, contains keyboard focus, and locks background scrolling. Reduced motion and disabled JavaScript bypass the animation. A four-second bootstrap timeout restores the site if hydration fails; blocked session storage also works. No external generation service or video download is required: the logo is animated directly with GSAP and CSS.

Gallery photo deep links retain their requested photo and defer the native viewer until the greeting finishes, including when the greeting is skipped. The viewer then receives focus and keeps its own scroll lock.

## Implementation

- `app/_components/Greeting.tsx` and `app/greeting.css`: lettering, timing, focus and dismissal.
- `lib/greeting.ts`: session flag, replay option, early initialization and fallback.
- `app/[locale]/layout.tsx`: greeting outside the site content and page.
- `app/_components/Arrival.tsx`: the arrival entrance waits for the greeting reveal.
- `app/_components/SmoothScroll.tsx` and `CatalogueViewer.tsx`: scroll and native dialog coordination.
- `lib/fonts.ts` and `messages/home-{en,ka,ru}.json`: original Latin wordmark and localized controls.

## Validation

- Production build and TypeScript passed.
- `scripts/verify-greeting.mjs` passed: English desktop, Georgian phone and landscape, Russian 320px phone, natural completion, repeat visits, preview replay, skip, keyboard focus, scroll lock, gallery deep links, live and initial reduced motion, disabled JavaScript, blocked storage and failed hydration. No browser errors.
- Arrival, landing interactions and SEO audits passed during implementation. The landing interaction audit was rerun after the gallery coordination fix.
- Desktop and mobile screenshots are under `docs/greeting-audit/`. `kencho-greeting-preview.mp4` records the implemented animation and page reveal.

Replay locally at `http://localhost:3000/en?intro=1`.
