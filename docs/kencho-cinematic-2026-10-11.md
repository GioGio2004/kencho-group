# Kencho landing continuation — 11 October 2026

Removed the paired house/lobby project tiles from the landing page. The existing photograph opening remains, followed by the introduction, full-screen interior film, interactive category preview, process, detail photographs, owner tour, answers and a charcoal closing invitation.

## Local footage

- `public/source/walkthrough.mp4` supplies the interior film. The desktop copy removes audio and moves MP4 metadata to the start without re-encoding the picture. The portrait copy is 540 × 960. Both retain the eight-second camera movement. Desktop: 1.98 MB; mobile: 0.81 MB.
- The owner section uses the existing `hero-owner.mp4` and portrait version, with the existing posters. No paid generation service or new provider is involved.
- The interior film is labelled as a cinematic study. Real furniture photographs accompany the four links into the portfolio.

## Behaviour

The walkthrough expands to an edge-to-edge, viewport-sized stage as it enters, then remains sticky briefly while the film plays. Both films load near the viewport, play silently in view, and pause offscreen or when the tab is hidden. A visitor's explicit pause persists. Playback and supported browser full-screen controls are keyboard accessible. Reduced motion disables automatic playback and scrolling animation, while explicit playback remains available. Server HTML retains posters, native video controls and ordinary gallery links when JavaScript is unavailable.

Category previews change on hover or keyboard focus. GSAP adds restrained picture parallax and draws the process rule as the section passes. New film copy is translated into Georgian, Russian and English.

## Verification

- Production build and TypeScript passed.
- `scripts/verify-landing.mjs`: all three languages at six widths; video playback and full-screen controls; keyboard focus; menu, contact and gallery navigation; detail expansion; analytics events; reduced motion; no-JavaScript content. No browser or local request errors.
- `scripts/verify-arrival.mjs`: all three languages at seven viewport sizes, chapter controls, reverse scroll, responsive rebuild, live reduced-motion changes and no-JavaScript anchors. No browser or asset errors.
- `scripts/verify-film.mjs`: both videos actually play at seven screen sizes in each language; viewport dimensions, control/copy bounds, mobile source selection, persistent pause, media switching after resize and explicit playback under reduced motion. No browser errors.
- `scripts/verify-seo.mjs`: 28/28 passed, including every sitemap URL.
- `git diff --check` passed.

Final screenshots are in `docs/cinema-audit/`. Local preview: `http://localhost:3000/en#interior-film`. This change has not been deployed.
