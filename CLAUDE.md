# CLAUDE.md — Kencho Group Monorepo

Read this fully before any task. Design reference patterns are in §2,
motion vocabulary in §3, animation presets ("combos") in §4. When the user
says "Combo N", use the exact recipe from §4.

---

## 1. Project & Architecture

**Kencho Group** (kenchogroup.ge) — custom furniture company, Tbilisi, Georgia.
Public site sells high-end custom furniture through project storytelling;
admin is an invite-only CMS.

**Turborepo monorepo, pnpm (never npm/yarn):**

- `apps/web` — public Next.js (App Router) site → kenchogroup.ge
- `apps/admin` — CMS behind Clerk auth → admin.kenchogroup.ge
- `packages/backend` — shared Convex schema + functions (projects, leads)

### Hard rules (never violate)

1. **Public routes fetch Convex server-side only** — `fetchQuery`/`preloadQuery`
   from `convex/nextjs` in server components. Never `useQuery` in `apps/web`
   public pages. Full content must exist in initial HTML (SEO + AI crawlers
   don't run JS).
2. **Never modify auth**: Clerk config, middleware protection in `apps/admin`,
   or Convex auth config — unless the task explicitly says so.
3. **Admin stays noindex** (robots + X-Robots-Tag). Public robots.ts allows
   AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.).
4. **Images through ImageKit** with URL transforms via the next/image loader
   (`f-auto,q-auto` + width). Never serve originals. Every image needs
   meaningful `alt` text.
5. **Content before motion**: pages fully readable with JS disabled. GSAP is
   progressive enhancement (see §3/§4 rules).
6. Each page section = its own component (`Hero.tsx`, `FeaturedProjects.tsx`…).
   When asked to modify one section, touch only that component.
7. Commit after each approved section. Small, described commits.
8. Business facts (phone, address, socials, hours) come from
   `apps/web/config/business.ts` — never hardcode elsewhere.
9. SEO: every public route exports Metadata (unique title <60ch,
   description <160ch, canonical, OG image). Gallery projects:
   JSON-LD CreativeWork; site-wide: LocalBusiness; /faq: FAQPage.
10. Home page shows **teasers** of gallery/about/FAQ that link to the full
    pages — never duplicate their full content on home.

---

## 2. Design Reference — White Desert (white-desert.com)

Primary inspiration. Steal the _patterns and pacing_, never clone visuals —
Kencho keeps its own typography, palette, and personality (see DESIGN.md,
which overrides anything here if they conflict).

What makes the reference feel premium — reproduce these qualities:

- Generous whitespace; slow, confident animation timing; restrained palette;
  serif display + clean sans body pairing; few elements per viewport.

Patterns adopted for Kencho:

1. **Layered atmosphere hero** — full-bleed media with 1–2 semi-transparent
   texture layers drifting at different scrub speeds (depth). → Combo 2 + 3.
2. **Meta-labels as craft data** — small monospace annotations beside
   projects: wood species · dimensions · build hours (like their GPS
   coordinates). Use in gallery cards and project heroes.
3. **Stats band** — 3–4 large numbers (years of craft, projects delivered,
   build hours). → Combo 7.
4. **Featured projects rail** — horizontal cards: image, name, one-line
   description, meta-label, Learn More. → Combo 8 (desktop) / swipe
   carousel (mobile), or Combo 4 grid.
5. **Pull-quote dividers** — large-type client/founder quotes between
   sections. → Combo 1 with display sizing.
6. **Numbered process section** — Consultation → Design → Build → Install →
   Aftercare, each step a short paragraph. → Combo 5 (pinned) or Combo 6.

---

## 3. Motion Vocabulary (definitions)

GSAP + ScrollTrigger via `useGSAP()` (@gsap/react), scoped, with cleanup.

**Core:** tween (`gsap.to/from/fromTo`) · timeline (sequenced tweens,
position offsets like `"-=0.3"`) · duration (micro 0.2–0.4s, reveals
0.6–1.0s, hero 1.0–1.6s) · stagger (offset between elements, ~0.08) ·
ease (see cheat sheet).

**ScrollTrigger:** trigger (element that starts it) · start/end
(`"top 80%"` = trigger top hits 80% down viewport) · **scrub** (animation
progress tied to scroll; `scrub: 1` adds smoothing — THE term for "moves
while I scroll") · **pin** (element locks while user scrolls past) ·
toggleActions (`"play none none reverse"`) · snap · markers (dev only).

**Named patterns:**

- **Fade-up reveal** — `opacity: 0, y: 40 → 1, 0` on viewport entry.
- **Parallax / scrub-linked shift** — layers translate at different speeds
  tied to scroll (subtle: ≤80px total).
- **Clip-path reveal** — `inset(100% 0 0 0) → inset(0)`; editorial image
  entrance. Often + **image scale-settle** (`scale: 1.15 → 1` in
  overflow-hidden container).
- **Line draw** — SVG `stroke-dashoffset: length → 0`.
- **Rule reveal** — divider `scaleX: 0 → 1`, `transform-origin: left`.
- **Masked line reveal** — text split to lines, each in overflow-hidden
  wrapper, `yPercent: 100 → 0`, staggered. The signature premium heading
  entrance.
- **Pinned scrollytelling** — section pins; inner steps swap as user scrolls.
- **Horizontal rail** — pin + scrub translates panels via `xPercent`.
- **Counter tick** — number counts up on entry.
- **Marquee** — infinite constant-velocity loop (`ease: none`).
- **FLIP** — animate layout changes (reorder/resize/move) smoothly; GSAP
  Flip plugin. For gallery filtering.
- **Shared element transition** — thumbnail morphs into next page's hero.
- **Overlay wipe** — panel sweeps across during route change.
- **Micro:** hover lift (`y: -6` + shadow) · image hover zoom (1 → 1.05) ·
  underline draw (scaleX, directional origin) · magnetic button ·
  cursor follower (desktop only) · lerp (smoothed following).

**Easing cheat sheet:** `.out` = fast→gentle (entrances), `.in` = exits,
`.inOut` = both ends smooth. power1–4 increasing drama; `power3.out` =
workhorse entrance; `expo.out` = snappy hero; `back.out(1.4)` = slight
playful overshoot (buttons only); `none` = scrub/marquee only.
**Never** elastic/bounce on this brand.
Defaults: entrances `power3.out`, exits `power2.in`, scrub `none`,
hover `power2.out` 0.25–0.35s.

---

## 4. Animation Combos (presets)

Complete recipes. Reference by number. If the user gives content with no
combo, pick via the Auto-Map and state your choice.

**COMBO 1 — "Editorial Reveal"** (default text-led entrance)
Heading masked line reveal (0.9s, power3.out, stagger 0.1, at `top 85%`) →
rule reveal under it (scaleX 0→1, origin left, 0.8s, `"-=0.5"`) →
body fade-up (0.7s, stagger 0.08). Calm, never showy.

**COMBO 2 — "Cinematic Hero"** (page openers; max 1/page, runs on load)
Hero image clip-path `inset(100% 0 0 0)→inset(0)` + scale-settle 1.2→1
(1.4s, expo.out) → headline masked line reveal (1.0s, expo.out, stagger
0.12, `"-=0.9"`) → meta/CTA fade-up (0.6s, stagger 0.1) → optional SVG
line draw (1.2s, parallel).

**COMBO 3 — "Parallax Drift"** (image+text bands; the "alive scroll")
Scrub `true`, ease none, between `top bottom` and `bottom top`:
images y 0→-60, text y 0→-25, decorative y 0→-90. Plus one-time Combo-1
style fade-up on first entry at `top 80%`. Subtle or nothing.

**COMBO 4 — "Gallery Showcase"** (grids)
Cards fade-up + scale 0.96→1 (0.7s, stagger 0.08, ScrollTrigger.batch at
`top 85%`). Hover: image zoom 1→1.05 + lift y -6 + title underline draw.
Filter changes: FLIP (0.6s, power2.inOut).

**COMBO 5 — "Pinned Story"** (process narrative; max 1/site)
Pin ~2.5 viewport heights; 3–4 steps: text masked-line in, then y→-40 +
fade out as next enters; image crossfade/clip swap per step; thin progress
rule scrubbed; snap to steps. Under 768px: unpinned stacked fallback.

**COMBO 6 — "Split Feature"** (alternating image/text rows)
Image: clip-path from inner edge + scale-settle 1.15→1 (1.0s, power3.out,
`top 80%`); text: masked heading + body fade-up (`"-=0.6"`); image-only
scrub parallax y 0→-30. Mirror direction per row.

**COMBO 7 — "Proof Bar"** (stats band)
Container fade-up → each number counter-tick 0→value (1.2s, power1.out,
once, stagger 0.15) + rule reveals between stats.

**COMBO 8 — "Horizontal Rail"** (max 1/page)
Pin section; track xPercent scrubbed through 3–5 panels; per-panel mini
fade-up at viewport center; progress rule underneath. <768px: native
swipe carousel, never pinned.

**COMBO 9 — "Quiet Close"** (CTA/footer)
CTA heading masked line reveal (0.8s, power2.out) → button fade-up with
back.out(1.4) scale 0.95→1, hover = magnetic (desktop) + underline draw →
footer columns fade-up (stagger 0.06, y: 20).

**COMBO 10 — "Passage"** (route transitions)
Exit overlay wipe up (0.5s, power3.inOut) → incoming hero runs its combo.
Gallery→project: clicked thumbnail FLIPs into project hero (shared
element) during the wipe. Total perceived <0.9s.

**COMBO 11 — "Focus Rail"** (featured projects; max 1/page)
HOVER-driven expanding accordion; resting on a sliver opens it. Active
panel wide+sharp with staggered text, inactive panels blurred slivers
(pre-blurred image layer crossfaded by opacity — never CSS filter);
width swap ~0.75s power3.inOut, text out-first (0.2s power2.in) and
in during the growth (0.5s power3.out, stagger 0.08, delay ~0.22).
No input lock — tweens retarget (overwrite) under a sweeping pointer.
Every panel is its link (hover opens, click travels); keyboard focus
counts as hover; "View project" is a cursor-trailing chip over the open
panel with a static in-panel fallback for phones/keyboard/reduced
motion/no-JS. The width tween is the documented exception to the
transform-only rule (will-change on for the move, cleared after).
Mobile = swipe carousel, sharp only, position counter. Implemented in
`app/_components/FocusRail.tsx`.

**COMBO 12 — "Panorama Rail"** (max 1/page, mutually exclusive with
Combo 8)
Pinned ~4-viewport-height horizontal journey; background scenes scrub
slowly (three seamless 100vw full-bleeds, ease none) while the content
track — title scene → floating project cards with frosted edges +
bracketed monospace meta → full-bleed quote scene — scrubs ~1.6× faster
for parallax depth. Snap to 5 stops (0 / .285 / .5 / .715 / 1;
power1.inOut, 0.4s); per-card micro-entrance via containerAnimation
(y 30→0, opacity .85→1, text stagger 0.06, reversible); progress rule
scaleX-scrubbed. Arrow keys / card focus walk the stops as synthetic
wheel bursts (Lenis stays the one scroller). The horizontal layout
exists only under desktop + motion + JS (a .pano-on class); the base
DOM is a vertical page — title block, cards, quote with per-block cover
images — for phones, reduced motion, crawlers and no-JS. Transforms
only on the tracks; card frost is a translucent solid, never a
backdrop-filter. Implemented in `app/_components/PanoramaRail.tsx`.

**Auto-Map:** hero→2 · text block→1 · image+text band→3 · grid→4 ·
process→5 (short: 6) · alternating rows→6 · stats→7 · rail/logos→8 ·
CTA/footer→9 · route change→10.

**Global combo rules:**

1. Per page: one Combo 2; max one Combo 5; max one Combo 8. Combos
   1/3/4/6 repeat freely.
2. One easing personality site-wide (power3/expo out entrances).
3. Everything readable with JS disabled.
4. `gsap.matchMedia()`: prefers-reduced-motion → 0.3s opacity fades only;
   touch → no magnetic/cursor/tilt, no heavy pins.
5. Animate only transform + opacity in anything scrubbed/frequent;
   no layout-property animation; CLS ≈ 0 (correct pinSpacing, reserved
   space); `ScrollTrigger.refresh()` after dynamic content loads;
   target 60fps.
6. Timings here are defaults — DESIGN.md overrides win.

---

## 5. Workflow

- Work section-by-section: implement one component, stop for review, then
  proceed. Never rebuild a whole page in one pass unless asked.
- Before UI work: read DESIGN.md (visual tokens) — it overrides §2–§4
  defaults on conflict.
- After each major task: run the build; report files created/changed.
- Verify SSR: key pages must show full text via curl (no-JS check).
