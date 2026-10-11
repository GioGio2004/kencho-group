# Kencho photographic opening — 11 October 2026

A new opening section sits before the existing landing-page hero. It uses the site's own Kencho wordmark and three existing project photographs: the walnut-and-white island kitchen, fluted oak detail, and green island kitchen.

The letters reveal on arrival. Scrolling expands the framed photograph into a full-screen composition, then moves through two directional photographic reveals with gentle perspective and camera movement. Chapter controls let visitors move directly between the three compositions. The collection link skips ahead to the existing work section, and the final arrow continues to the original introduction.

GSAP controls the timeline while CSS provides native sticky positioning. Fine pointers add a small photographic parallax. The fixed header changes colour while the opening is visible. Portrait image sizing accounts for the height of a full-screen crop instead of requesting a low-resolution image for the narrow screen width.

The copy is available in Georgian, Russian and English. Reduced motion and disabled JavaScript produce a single static opening with working anchor links. No video-generation provider, new dependency or paid service is involved. This is a local implementation; it has not been deployed.

Validation:

- `npm run build`: production compilation, TypeScript and route generation passed.
- `node scripts/verify-arrival.mjs`: three languages across seven viewports, chapter selection and reverse movement, responsive timeline reconstruction, live reduced-motion changes, static fallback, no-JavaScript links, language contrast and local image loading passed. No browser errors or failed local requests.
- `npm run verify:landing`: existing gallery, menu, contact, keyboard focus, nested dialogs, responsive layouts and no-JavaScript contact regression checks passed against the production server.
- `npm run verify:seo`: 28/28 checks passed against the production server.
- Visual review covered the opening, every chapter, narrow phones and short landscape screens. Screenshots are in `docs/arrival-audit/`.

The existing developer server remains available at `http://localhost:3000/en`. The temporary production QA server is stopped after verification.
