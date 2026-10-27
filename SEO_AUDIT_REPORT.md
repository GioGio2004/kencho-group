# SEO Audit Report — kenchogroup.ge

Audit date: **2026-10-26 (Asia/Tbilisi)**. Repository: **C:/Users/khvic/Desktop/kencho-group**. Source commit: **e726585**. Framework: **Next.js 16.2.12**, App Router; next-intl 4.x.

**Scope and method:** Repository-wide route, component, text-splitting, heading, image, metadata, schema and configuration searches; inspection of active component composition and all nine message dictionaries; live HTTP GET of all 27 sitemap pages; parsing their initial HTML without running application JavaScript; cookie-free redirect probes; a JavaScript-disabled homepage load and a separate hydrated SplitText check. CMS-dependent values below are the production snapshot, not invented local fixtures. Installed Next.js documentation was consulted for Server/Client Components, metadata, image preload and redirects.

**Read-only boundary:** This report is the sole requested file addition. Application files, configuration, dictionaries, CMS records and dependencies were not edited. No build, formatter, deployment, IndexNow submission or crawler configuration change was run. Existing HTML captures at the repository root and screenshots under docs/ are historical evidence, not active routes. Dependency/build directories were excluded from first-party scans, except targeted documentation/library reads. This is not a claim to have inspected Google Search Console or the unavailable 127-URL crawl export; HTTP 200/indexable markup does not prove Google indexing or rankings. No field Core Web Vitals measurement was performed.

## 1. Critical Blockers (Red)

### R1 — Georgian and Russian homepages deliver the English main content

**Confirmed in source and production.** The normalized main text on /ka, /en and /ru is identical. Each has localized title/description, html lang and hreflang, but all seven active landing sections hardcode English text. app/[locale]/page.tsx:6–12,31–49 imports src/components/*; those content components do not read locale dictionaries. The multilingual messages/home-ka.json and messages/home-ru.json do not translate this active implementation.

- src/components/HeroSection.tsx:222–249: the visible H1 is the KENCHO GROUP wordmark. Its intact sr-only text is **“Kencho Group — bespoke furniture and millwork in Tbilisi”**, in English in all locales.
- src/components/HorizontalConceptSection.tsx:413,458,519,538; CircleRevealSection.tsx:23–64,237; ManifestoMapSection.tsx:258,393; MaterialsIndexSection.tsx:19–59,336; EditorialSplitSection.tsx:9–64,85,125,226,286: English headings, services, material descriptions, FAQs and calls to action.
- src/components/ParallaxQuoteSection.tsx:112 and FixedHudFrame.tsx also contain English interface/editorial text. FixedHudFrame reads the locale for switching but does not translate its copy.

**Impact:** The most important page lacks Georgian/Russian commercial body copy and presents near-duplicate main content under three language URLs. This is a confirmed relevance/localization defect, not evidence of a penalty. Google documents that untranslated main content can make localized URLs duplicates; hreflang does not translate the page. [Google localized-version guidance](https://developers.google.com/search/docs/specialty/international/localized-versions).

**Next step:** Localize the actual mounted sections and provide a visible, natural commercial H1, e.g. Georgian “სამზარეულოსა და კარადების დამზადება შეკვეთით თბილისში”. Keep the animated brand treatment as branding, with one semantic H1 and an intact equivalent of any animated text. Match every translated title/description to its page content.

### R2 — Important home content is absent until a visitor interacts

**Confirmed in source and initial HTML.** This is conditional rendering, not an inherent failure of use client.

| Location | Initial state and missing content | Consequence |
| --- | --- | --- |
| src/components/HeroSection.tsx:67,189,400–426 | activeHotspot=null; all three hotspot H2s and descriptions are absent | “BUILT TO THE MILLIMETRE”, “EUROPEAN TIMBER & STONE” and “ONE TEAM, ONE WORKSHOP” descriptions require hover/click |
| src/components/CircleRevealSection.tsx:73,237–243,314 onward | activeIdx=0; only PRECISION MILLWORK and its kitchen description are rendered | Wardrobe/storage, wall-paneling and commercial descriptions require carousel navigation |
| src/components/EditorialSplitSection.tsx:66–67,231–269 | openFaq=0 and isOpen conditional | Four questions but only the first answer are in the initial DOM; three answers require clicks |

A no-JavaScript production load confirmed one room title and only the first homepage FAQ answer. Strings inside a JavaScript bundle or RSC serialization are not equivalent to rendered semantic content. Google does not click or swipe to reveal primary content. [Google lazy-content guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading).

**Next step:** Render all substantive localized service copy and FAQ answers in server HTML. Use native details/summary or persistent panels for disclosure, then enhance their presentation. The existing app/_components/FaqList.tsx already provides this pattern on /faq and /about. Existing gallery pages contain related category copy, so the missing homepage sections do not mean these entire services are absent site-wide.

**No site-wide indexing blocker found:** All 27 sitemap pages returned 200, index/follow, one H1, one self-canonical and four reciprocal language alternatives. Robots allows crawling. No blanket noindex, missing canonical set, or wholly client-only page was found.

## 2. Architecture & Keyword Gaps (Yellow)

### Vector 1 — Split-text DOM fragmentation

ARIA is an accessibility mechanism, not a directive telling Google which text to index. Fragmented markup is not by itself proof of an SEO failure. The meaningful checks are intact server text, preserved word boundaries, semantic headings, and equivalent accessible text.

| Exact file and lines | Fragmentation | Parent label / hidden children / intact fallback | Finding |
| --- | --- | --- | --- |
| src/components/HeroSection.tsx:230–249; split at 233 | Per-letter spans for KENCHO and GROUP, rendered on server | H1 sr-only sentence at 223–225; animated ancestor aria-hidden=true at 227 | Accessibility safeguard present; the fallback is English in all locales (R1) |
| src/components/MaterialsIndexSection.tsx:103–109; target paragraph 407–417 | GSAP SplitText lines,words with line masks after hydration, across all five captions | No explicit aria option, so installed GSAP defaults to aria=auto; adds parent aria-label and aria-hidden=true on words/lines | PASS. Initial HTML contains intact paragraphs. Hydrated production verified all five labels and all 87 generated word nodes hidden from the accessibility tree |
| app/_components/Greeting.tsx:128–138 | KENCHO and GROUP split into letter spans; KENCHO has outline/fill copies | Entire brand wrapper aria-hidden=true at 126; localized dialog label at 118–119 | Decorative duplication is protected. Mounted via layout, but homepage CSS hides this legacy greeting; bootstrap replay is opt-in via ?intro=1 |
| app/_components/Arrival.tsx:343–352; split at 345 | Per-letter brand wordmark | Parent aria-label=SITE.name at 343; animated children aria-hidden=true at 344 and 351 | PASS in source; this old homepage component is not mounted by the current route |
| src/components/HorizontalConceptSection.tsx:418–445 | Sentences manually divided into line spans, animated with stagger at 254–260 | No heading/paragraph aria-label, no hidden visual copy, no sr-only complete version | YELLOW: adjacent text nodes lack explicit inter-line spaces; raw H2 joins STUDIODESIGNED and TIMBERAND |
| src/components/HorizontalConceptSection.tsx:458–481 | Manual per-word NEW / GOLDEN / CRAFT spans | No intact fallback; only the decorative T B I L I S I label is aria-hidden | YELLOW: textContent becomes NEWGOLDENCRAFT; provide intact wording/real spaces |
| src/components/HorizontalConceptSection.tsx:538–555 | Manual phrase spans plus “yours” | No intact fallback or explicit separators | YELLOW: textContent becomes THE SPACE YOU WANTEDyoursTHIS YEAR |
| src/components/ManifestoMapSection.tsx:299–329 | Staggered display words TBILISI / WORKSHOP / CRAFT in separate divs; spaced G E O R G I A within the middle row | No parent phrase label, hidden-child arrangement or equivalent whole phrase | Decorative display copy rather than the main H2; improve readable word boundaries and use CSS letter-spacing instead of literal spaced letters |
| src/components/ManifestoMapSection.tsx:410–421 | Three display spans: FROM OUR HANDS / Directly / TO YOUR HOME | No complete-label/fallback arrangement | Phrase-level typography; keep an intact accessible/readable equivalent |
| src/components/EditorialSplitSection.tsx:85–98 | Manual MADE / To Live in spans | No label/fallback; no explicit separating text node | YELLOW: raw H2 is MADETo Live in |

The last six rows include manually fragmented phrases/lines, beyond automated word/letter splitting. No custom split(" ") sentence renderer was found. lib/catalogue.ts:79 splits an alt string at “ — ” to derive a title; it does not split DOM words. Array.from in lib/modal-lock.ts gathers focusable controls. Other stagger animations in Catalogue, ContactProvider, HomeMotion, HomeServices, ProjectTiles and the remaining sections move whole nodes rather than split sentences. SVG shapes, counters and icon spans are not sentence fragmentation.

GSAP's behavior was checked in node_modules/gsap/SplitText.js:45–49,204–213 and against [official SplitText documentation](https://gsap.com/docs/v3/Plugins/SplitText/). A plain textContent concatenation demonstrates missing source separators, but does not establish that Google ignores block layout or fails to recognize every phrase.

### Vector 2 — SSR / client boundary audit

All **six page.tsx files and the one layout.tsx** are Server Components; none begins with use client. app/[locale]/template.tsx is also server-rendered. Root layout duties live in app/[locale]/layout.tsx; absence of app/layout.tsx is not a missing-root-layout bug.

| Route source | Client boundary / initial HTML result |
| --- | --- |
| app/[locale]/page.tsx | Server route composing eight client components (FixedHudFrame plus seven sections). Initial-state headings and paragraphs SSR correctly; exceptions are the interaction-gated content in R2 |
| app/[locale]/layout.tsx | Server metadata, locale validation and FurnitureStore JSON-LD. Client providers accept server children; they do not erase SSR. Footer is server-rendered |
| app/[locale]/(pages)/about/page.tsx | H1, workshop copy, process H2 and five H3s, designer text, three FAQ answers SSR; ContactButton is interactive only |
| app/[locale]/(pages)/faq/page.tsx | H1 and all four native-details FAQ answers SSR, matching FAQPage JSON-LD |
| app/[locale]/(pages)/contact/page.tsx | H1, contact labels and client ContactPanel's initial text/links SSR; its dynamic Heading defaults to H2 |
| app/[locale]/(pages)/gallery/page.tsx | Server fetches chapters/photos; CatalogueShell H1/lede and Catalogue client grid SSR. Production contains all 56 images, localized alts and available tile labels |
| app/[locale]/(pages)/gallery/[slug]/page.tsx | Server fetches CMS category, metadata, H1/lede, breadcrumbs and CreativeWork; initial gallery images SSR. Unknown tested slug returns real 404 |

Primary client text modules marked use client at line 1: all eight src/components/*.tsx, plus Catalogue, CatalogueViewer and ContactPanel. Interactive/global boundaries include ContactProvider, MenuProvider, MegaMenu, SiteHeader, LocaleSwitch, SmoothScroll, ScrollRail, Greeting, ContactButton, ContactLink and WorkLink. Legacy client sections (Arrival, FocusStrip, DetailStrip, HomeFilm, HomeMotion, HomeServices, LatestWork, ProjectTiles, SelectedWork and MenuOverlay) exist in the repository but are not the current homepage composition. Legacy Hero and Statement are server components, likewise not mounted there.

**Distinguish absent from hidden:** All five MaterialsIndex captions are present in server HTML; four start with visibility:hidden. Several GSAP scenes use transforms, clipping or opacity until scrolling. With CSS fully loaded and JavaScript disabled at 1440×900, the hero image begins at y=900 because its wrapper starts at translateY(100%); its reveal depends on JS. CircleReveal's Framer Motion image starts at opacity 0. These are progressive-enhancement/visibility risks, not evidence that their already-present text is missing from HTML. Provide a useful static/reduced-motion presentation; measure actual LCP before assigning a performance regression.

Gallery detail captions/H2 are inside CatalogueViewer.tsx:122–123 and appear when a tile is opened. A direct /ka/gallery/kitchens?p=1 request does contain the selected viewer H2 in server HTML, but the canonical remains the category. The base gallery grid provides images and labels rather than individual indexable project-detail pages. That is a content architecture choice, not a use-client leak.

Installed reference: node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md explains that Client Components participate in initial HTML prerendering.

### Vector 3 — Routes, locale handling and the 127-page claim

**Actual route surface:** /[locale], /[locale]/gallery, /[locale]/gallery/[slug], /[locale]/about, /[locale]/faq, /[locale]/contact. The (pages) directory is a route group and does not enter URLs. There is no current planner page or service-detail route. Gallery slugs are CMS records, not generated from every photo filename.

proxy.ts:1–20 uses next-intl middleware under the Next.js 16 proxy convention. i18n/routing.ts:4–24 sets ka/ru/en, default ka, localePrefix=always and alternateLinks=false. Locale detection remains enabled by the library default. Unprefixed paths are **307 redirects**, not 301/308 and not duplicate 200 documents; explicit locale paths serve the corresponding route. Supported locale cookie/preferences can choose en or ru, so the proxy comment “/ redirects to /ka” describes the default, not every visitor. Locale validation calls notFound for unsupported values. The matcher excludes API/internal and dot-containing asset/metadata paths.

Cookie-free production probes:
| Request / condition | Status | Location |
| --- | --- | --- |
| https://kenchogroup.ge/ka | 308 | https://www.kenchogroup.ge/ka |
| / — No language or cookie | 307 | /ka |
| /gallery/kitchens — No language or cookie | 307 | /ka/gallery/kitchens |
| / — English preference | 307 | /en |
| /gallery/kitchens — English preference | 307 | /en/gallery/kitchens |
| / — Russian cookie | 307 | /ru |
| /gallery/kitchens — Russian cookie | 307 | /ru/gallery/kitchens |
| /ka/gallery/kitchens/ | 308 | /ka/gallery/kitchens |
| /ka/planner, /ka/projects, /ka/services | 308 | /ka/gallery |
| /ka/process | 308 | /ka/about |
| /en/planner | 308 | /en/gallery |
| /ru/services | 308 | /ru/gallery |
| /planner etc. without a locale | 307 → 308 | Locale-prefixed retired path → replacement |
| /ka/gallery/kitchens?p=1 | 200 | No redirect; canonical is /ka/gallery/kitchens |
| /ka?intro=1 and /ka?utm_source=audit | 200 | No redirect; canonical is /ka |
| /ka/gallery/not-a-published-gallery-seo-audit | 404 | No redirect |
| /kg-en.html | 404 | Root capture file is not publicly served |

Permanent retirement mappings are declared in next.config.ts:36–48 for all three locales. They match the exact retired paths, not arbitrary nested /projects/... paths. A fixed 308 for every unprefixed URL would alter locale negotiation; it is not automatically preferable to the current 307. Consider that change only if deterministic Georgian defaults are intended.

**Sitemap:** app/sitemap.xml/route.ts is the XML generator; there is no app/sitemap.ts. PAGES at lines 12–18 has five paths, each expanded over three locales. listPublishedSlugs at 102 adds one URL per locale for each published gallery. Current count is **3 × (5 + 4) = 27**, not 127. Each URL has ka, ru, en and x-default alternates; these 108 alternate declarations point back to the same 27 URLs, not 108 new pages. The generated OG images and static files are resources, not sitemap HTML pages.

Exact live sitemap loc entries:

- https://www.kenchogroup.ge/ka
- https://www.kenchogroup.ge/ru
- https://www.kenchogroup.ge/en
- https://www.kenchogroup.ge/ka/gallery
- https://www.kenchogroup.ge/ru/gallery
- https://www.kenchogroup.ge/en/gallery
- https://www.kenchogroup.ge/ka/about
- https://www.kenchogroup.ge/ru/about
- https://www.kenchogroup.ge/en/about
- https://www.kenchogroup.ge/ka/faq
- https://www.kenchogroup.ge/ru/faq
- https://www.kenchogroup.ge/en/faq
- https://www.kenchogroup.ge/ka/contact
- https://www.kenchogroup.ge/ru/contact
- https://www.kenchogroup.ge/en/contact
- https://www.kenchogroup.ge/ka/gallery/kitchens
- https://www.kenchogroup.ge/ru/gallery/kitchens
- https://www.kenchogroup.ge/en/gallery/kitchens
- https://www.kenchogroup.ge/ka/gallery/wardrobes-storage
- https://www.kenchogroup.ge/ru/gallery/wardrobes-storage
- https://www.kenchogroup.ge/en/gallery/wardrobes-storage
- https://www.kenchogroup.ge/ka/gallery/commercial-spaces
- https://www.kenchogroup.ge/ru/gallery/commercial-spaces
- https://www.kenchogroup.ge/en/gallery/commercial-spaces
- https://www.kenchogroup.ge/ka/gallery/home-interiors
- https://www.kenchogroup.ge/ru/gallery/home-interiors
- https://www.kenchogroup.ge/en/gallery/home-interiors

**Robots:** app/robots.ts:26–34 emits Allow: / for *, Googlebot, Bingbot and the named AI agents, and points to https://www.kenchogroup.ge/sitemap.xml. Live /robots.txt returned 200 with those rules. No disallow explains missing pages. No need to block locale or query URLs merely to lower a crawler count; blocking can prevent crawlers from seeing their canonicals.

**Why 127 cannot be proven:** No crawl export, crawl date, discovery source, historical sitemap or Search Console report was supplied. The current generator always emits a multiple of three; 127 cannot be its current complete loc count. “Crawled” can include redirects, errors, assets and noncanonical query variants and is not equivalent to “indexed”.

Plausible, evidence-backed sources to reconcile with that export:

1. Nine unprefixed page paths redirect to the locale set. Apex/www and trailing-slash variants also redirect. A crawler may count their responses separately.
2. Twelve localized retired URLs (four paths × three locales), plus unprefixed predecessors, can persist in historical discoveries/backlinks. They now redirect.
3. Photo viewer ?p= values, ?intro=1 and tracking parameters are 200-status variants that canonicalize to the clean page. Catalogue.tsx:82–87,146–150 writes ?p= through history APIs; this alone does not create crawlable anchor links. Legacy FocusStrip.tsx:141 and LatestWork.tsx:65 explicitly linked photo-query URLs, but neither is mounted by the current homepage. No first-party internal query hrefs were found in the 27 current raw HTML documents.
4. The 56 photographs are not 56 project routes. A tool might include image/OG/script resources in its total, depending on report scope. Root kg-ka.html, kg-en.html and gk.html are old captures, not route definitions.

To close the count precisely, group all 127 exported URLs by normalized host/path, locale, query, status, content type, canonical and discovery source; count each group and compare its crawl date with this 27-URL sitemap snapshot. Do not invent a 127-page decomposition or delete valid translated pages to force a number.

**Sitemap resilience gap:** On a CMS error, lines 99–105 log and continue with an empty slug list, returning a cacheable 200 sitemap with only 15 static URLs. This was not occurring during the audit. Preserve a last-known-good full sitemap or return an appropriate temporary failure instead of silently dropping all galleries. Static lastmod is build time (next.config.ts:19); galleries use createdAt (route.ts:108), so gallery edits do not advance lastmod and unrelated deploys advance static dates. Prefer meaningful content update timestamps.

### Vector 4 — Metadata, canonical and hreflang inventory

All current HTML routes have localized titles/descriptions, a self-canonical without parameters, four alternate links and OG image/title/locale. All 27 resolved og:title values exactly match title. **No live route is missing a locale-aware canonical or the existing language-alternate set.** Home inherits layout generateMetadata; every non-home page supplies its own metadata, so the layout's home canonical does not leak into descendants.

| Source | Metadata producer |
| --- | --- |
| app/[locale]/layout.tsx:34–87 | Home/default meta namespace; languages at 41–51 |
| app/[locale]/page.tsx | Inherits layout; no separate generateMetadata needed for this home route |
| app/[locale]/(pages)/gallery/page.tsx:27–38 | pageMetadata, metaGallery |
| app/[locale]/(pages)/about/page.tsx:26–37 | pageMetadata, metaAbout |
| app/[locale]/(pages)/faq/page.tsx:19–30 | pageMetadata, metaFaq |
| app/[locale]/(pages)/contact/page.tsx:23–34 | pageMetadata, metaContact |
| app/[locale]/(pages)/gallery/[slug]/page.tsx:22–86 | CMS title + brand; CMS description plus localized tail when shorter than 110 characters; first non-null image; locale-aware canonical/alternates |
| lib/page-metadata.ts:27–63 | Shared absolute canonical, alternates, OG/Twitter helper |
| app/[locale]/template.tsx | No metadata; wrapper only |

**Requested ka-GE vs actual ka:** HTML and sitemap emit ka, en, ru, x-default; **ka-GE is absent everywhere**. ka is a valid language-only hreflang, so this is a requested regional-targeting difference, not malformed markup. If Georgian-in-Georgia targeting is desired, update the emitted hreflang key consistently in layout, shared helper, dynamic gallery metadata, sitemap and verifier. Keep /ka URL segments. x-default already points directly to the ka counterpart, not to the redirecting bare path. [Google hreflang reference](https://developers.google.com/search/docs/specialty/international/localized-versions).

The tables below contain the exact production title/description values. Canonical is the full URL in its column. H(path) refers to the exact alternate mapping in the next table. OG title equals the listed title; OG locale is ka_GE / en_US / ru_RU by row. Image IDs resolve to the exact observed URLs below.
| Route / locale | title = og:title | meta description | Canonical | Hreflang set | og:image | og:locale |
| --- | --- | --- | --- | --- | --- | --- |
| /ka | სამზარეულო და კარადები შეკვეთით თბილისში \| Kencho Group | ინდივიდუალური სამზარეულოები, კარადები და სრული ინტერიერები ერთი თბილისური სახელოსნოსგან — 3D დიზაინი, ზუსტი წარმოება და მონტაჟი ერთი გუნდის მიერ. | https://www.kenchogroup.ge/ka | H(/) | I1 | ka_GE |
| /ru | Кухни и шкафы на заказ в Тбилиси \| Kencho Group | Кухни, шкафы и целые интерьеры на заказ из одной тбилисской мастерской — 3D-дизайн, точное производство и монтаж одной командой. | https://www.kenchogroup.ge/ru | H(/) | I2 | ru_RU |
| /en | Custom kitchens & wardrobes in Tbilisi \| Kencho Group | Made-to-measure kitchens, wardrobes and full interiors from one Tbilisi workshop — 3D design, precise production and installation by a single team. | https://www.kenchogroup.ge/en | H(/) | I3 | en_US |
| /ka/gallery | კატალოგი — სამზარეულოები და კარადები \| Kencho Group | Kencho Group-ის კატალოგი: დასრულებული სამზარეულოები, კარადები და ინტერიერები, დამზადებული ინდივიდუალური ზომით თბილისში. | https://www.kenchogroup.ge/ka/gallery | H(/gallery) | I4 | ka_GE |
| /ru/gallery | Каталог — кухни, шкафы, интерьеры \| Kencho Group | Каталог Kencho Group: готовые кухни, шкафы и интерьеры по индивидуальным размерам в Тбилиси. Принесите проект дизайнера — мы его изготовим. | https://www.kenchogroup.ge/ru/gallery | H(/gallery) | I4 | ru_RU |
| /en/gallery | Catalogue — kitchens, wardrobes, interiors \| Kencho Group | The Kencho Group catalogue: finished kitchens, wardrobes and interiors made to measure in Tbilisi. Bring your designer's project — we build it. | https://www.kenchogroup.ge/en/gallery | H(/gallery) | I4 | en_US |
| /ka/about | ჩვენ შესახებ — როგორ ვმუშაობთ \| Kencho Group | Kencho Group — ინდივიდუალური ავეჯის სახელოსნო თბილისში: აზომვა, დამზადება და მონტაჟი ერთი გუნდის მიერ. დიზაინერის პროექტს ზუსტად ვასრულებთ. | https://www.kenchogroup.ge/ka/about | H(/about) | I5 | ka_GE |
| /ru/about | О нас — как мы работаем \| Kencho Group | Kencho Group — мастерская мебели на заказ в Тбилиси: замер, производство и монтаж одной командой. Проекты дизайнеров выполняем точно. | https://www.kenchogroup.ge/ru/about | H(/about) | I5 | ru_RU |
| /en/about | About us — how we work \| Kencho Group | Kencho Group is a custom furniture workshop in Tbilisi: measurement, production and installation by one team. We build designers' projects exactly. | https://www.kenchogroup.ge/en/about | H(/about) | I5 | en_US |
| /ka/faq | ხშირი კითხვები ავეჯის შეკვეთაზე \| Kencho Group | დიზაინერთან მუშაობა, ავეჯის დაგეგმვა, მასალების შერჩევა და კომერციული ინტერიერები — სასარგებლო პასუხები Kencho Group-ისგან. | https://www.kenchogroup.ge/ka/faq | H(/faq) | I4 | ka_GE |
| /ru/faq | Вопросы о мебели на заказ \| Kencho Group | Работа с дизайнером, планирование мебели, выбор материалов и коммерческие интерьеры — полезные ответы Kencho Group. | https://www.kenchogroup.ge/ru/faq | H(/faq) | I4 | ru_RU |
| /en/faq | FAQ — custom furniture questions \| Kencho Group | Working with a designer, planning furniture, choosing materials and commercial interiors — useful answers from Kencho Group. | https://www.kenchogroup.ge/en/faq | H(/faq) | I4 | en_US |
| /ka/contact | კონტაქტი — Kencho Group | დაუკავშირდით Kencho Group-ს WhatsApp-ზე ან ტელეფონით. გაუზიარეთ იდეები ან დიზაინერის ნახაზები ჩვენს ავეჯის გუნდს თბილისში. | https://www.kenchogroup.ge/ka/contact | H(/contact) | I4 | ka_GE |
| /ru/contact | Контакты — Kencho Group | Свяжитесь с Kencho Group в WhatsApp или по телефону. Поделитесь идеями или чертежами дизайнера с нашей мебельной командой в Тбилиси. | https://www.kenchogroup.ge/ru/contact | H(/contact) | I4 | ru_RU |
| /en/contact | Contact — Kencho Group | Contact Kencho Group on WhatsApp or by phone. Share your ideas or designer’s drawings with our furniture team in Tbilisi. | https://www.kenchogroup.ge/en/contact | H(/contact) | I4 | en_US |
| /ka/gallery/kitchens | სამზარეულოები \| Kencho Group | სამზარეულოები ინდივიდუალური ზომით — კუნძულები, ჩაშენებული ტექნიკა და ქვის ზედაპირები, დამზადებული და დამონტაჟებული ჩვენი თბილისური სახელოსნოს მიერ. | https://www.kenchogroup.ge/ka/gallery/kitchens | H(/gallery/kitchens) | I6 | ka_GE |
| /ru/gallery/kitchens | Кухни \| Kencho Group | Кухни по индивидуальным размерам — острова, встроенная техника и каменные столешницы, изготовленные и установленные нашей мастерской в Тбилиси. | https://www.kenchogroup.ge/ru/gallery/kitchens | H(/gallery/kitchens) | I6 | ru_RU |
| /en/gallery/kitchens | Kitchens \| Kencho Group | Made-to-measure kitchens — islands, integrated appliances and stone worktops, built and installed by our Tbilisi workshop. | https://www.kenchogroup.ge/en/gallery/kitchens | H(/gallery/kitchens) | I6 | en_US |
| /ka/gallery/wardrobes-storage | კარადები და სათავსოები \| Kencho Group | ჩაშენებული კარადები, დერეფნის სისტემები და სათავსო კედლები — ყოველი კუთხე აზომილი და გამოყენებული. დამზადებულია Kencho Group-ის მიერ თბილისში. | https://www.kenchogroup.ge/ka/gallery/wardrobes-storage | H(/gallery/wardrobes-storage) | I7 | ka_GE |
| /ru/gallery/wardrobes-storage | Шкафы и системы хранения \| Kencho Group | Встроенные шкафы, прихожие и системы хранения — каждый угол замерен и использован. Мебель на заказ от Kencho Group в Тбилиси. | https://www.kenchogroup.ge/ru/gallery/wardrobes-storage | H(/gallery/wardrobes-storage) | I7 | ru_RU |
| /en/gallery/wardrobes-storage | Wardrobes & storage \| Kencho Group | Built-in wardrobes, hallway systems and storage walls — every corner measured and put to work. Made to measure by Kencho Group in Tbilisi. | https://www.kenchogroup.ge/en/gallery/wardrobes-storage | H(/gallery/wardrobes-storage) | I7 | en_US |
| /ka/gallery/commercial-spaces | კომერციული სივრცეები \| Kencho Group | ოფისები, ლობები და მისაღები სივრცეები — სრული მოწყობა ნახაზიდან გახსნის დღემდე. დამზადებულია Kencho Group-ის მიერ თბილისში. | https://www.kenchogroup.ge/ka/gallery/commercial-spaces | H(/gallery/commercial-spaces) | I8 | ka_GE |
| /ru/gallery/commercial-spaces | Коммерческие пространства \| Kencho Group | Офисы, лобби и зоны ресепшн — комплексные интерьеры от чертежа до дня открытия. Мебель на заказ от Kencho Group в Тбилиси. | https://www.kenchogroup.ge/ru/gallery/commercial-spaces | H(/gallery/commercial-spaces) | I8 | ru_RU |
| /en/gallery/commercial-spaces | Commercial spaces \| Kencho Group | Offices, lobbies and reception areas — complete fit-outs from drawing to opening day. Made to measure by Kencho Group in Tbilisi. | https://www.kenchogroup.ge/en/gallery/commercial-spaces | H(/gallery/commercial-spaces) | I8 | en_US |
| /ka/gallery/home-interiors | საცხოვრებელი ინტერიერები \| Kencho Group | საძინებლები, სააბაზანოები, მედია-კედლები და პანელები — დეტალები, რომლებიც სახლს ასრულებს. დამზადებულია Kencho Group-ის მიერ თბილისში. | https://www.kenchogroup.ge/ka/gallery/home-interiors | H(/gallery/home-interiors) | I9 | ka_GE |
| /ru/gallery/home-interiors | Домашние интерьеры \| Kencho Group | Спальни, ванные, медиастены и панели — детали, которые завершают дом. Мебель на заказ от Kencho Group в Тбилиси. | https://www.kenchogroup.ge/ru/gallery/home-interiors | H(/gallery/home-interiors) | I9 | ru_RU |
| /en/gallery/home-interiors | Home interiors \| Kencho Group | Bedrooms, bathrooms, media walls and panelling — the details that finish a home. Made to measure by Kencho Group in Tbilisi. | https://www.kenchogroup.ge/en/gallery/home-interiors | H(/gallery/home-interiors) | I9 | en_US |

Exact language alternatives (identical on all three siblings of each row; ka-GE absent):

| H(path) | ka | en | ru | x-default |
| --- | --- | --- | --- | --- |
| / | https://www.kenchogroup.ge/ka | https://www.kenchogroup.ge/en | https://www.kenchogroup.ge/ru | https://www.kenchogroup.ge/ka |
| /gallery | https://www.kenchogroup.ge/ka/gallery | https://www.kenchogroup.ge/en/gallery | https://www.kenchogroup.ge/ru/gallery | https://www.kenchogroup.ge/ka/gallery |
| /about | https://www.kenchogroup.ge/ka/about | https://www.kenchogroup.ge/en/about | https://www.kenchogroup.ge/ru/about | https://www.kenchogroup.ge/ka/about |
| /faq | https://www.kenchogroup.ge/ka/faq | https://www.kenchogroup.ge/en/faq | https://www.kenchogroup.ge/ru/faq | https://www.kenchogroup.ge/ka/faq |
| /contact | https://www.kenchogroup.ge/ka/contact | https://www.kenchogroup.ge/en/contact | https://www.kenchogroup.ge/ru/contact | https://www.kenchogroup.ge/ka/contact |
| /gallery/kitchens | https://www.kenchogroup.ge/ka/gallery/kitchens | https://www.kenchogroup.ge/en/gallery/kitchens | https://www.kenchogroup.ge/ru/gallery/kitchens | https://www.kenchogroup.ge/ka/gallery/kitchens |
| /gallery/wardrobes-storage | https://www.kenchogroup.ge/ka/gallery/wardrobes-storage | https://www.kenchogroup.ge/en/gallery/wardrobes-storage | https://www.kenchogroup.ge/ru/gallery/wardrobes-storage | https://www.kenchogroup.ge/ka/gallery/wardrobes-storage |
| /gallery/commercial-spaces | https://www.kenchogroup.ge/ka/gallery/commercial-spaces | https://www.kenchogroup.ge/en/gallery/commercial-spaces | https://www.kenchogroup.ge/ru/gallery/commercial-spaces | https://www.kenchogroup.ge/ka/gallery/commercial-spaces |
| /gallery/home-interiors | https://www.kenchogroup.ge/ka/gallery/home-interiors | https://www.kenchogroup.ge/en/gallery/home-interiors | https://www.kenchogroup.ge/ru/gallery/home-interiors | https://www.kenchogroup.ge/ka/gallery/home-interiors |

Resolved OG image URLs:

| ID | URL |
| --- | --- |
| I1 | https://www.kenchogroup.ge/ka/opengraph-image?05e44d1a2ce54d72 |
| I2 | https://www.kenchogroup.ge/ru/opengraph-image?05e44d1a2ce54d72 |
| I3 | https://www.kenchogroup.ge/en/opengraph-image?05e44d1a2ce54d72 |
| I4 | https://www.kenchogroup.ge/furniture/walnut-island-kitchen-tbilisi-kencho-group.webp |
| I5 | https://www.kenchogroup.ge/video/hero-owner-poster.jpg |
| I6 | https://fleet-bee-669.eu-west-1.convex.cloud/api/storage/0ff0ccc7-c73e-458a-9858-b715f3dbed45 |
| I7 | https://fleet-bee-669.eu-west-1.convex.cloud/api/storage/ffd7a55b-b25c-4393-99bd-863efff827bb |
| I8 | https://fleet-bee-669.eu-west-1.convex.cloud/api/storage/ee64902f-0e70-4a2e-99cd-c1c1c9457f15 |
| I9 | https://fleet-bee-669.eu-west-1.convex.cloud/api/storage/0a49bf46-c9c7-48d8-979a-4a821e6b7d4a |

**Metadata gaps to address:**

- Gallery/category titles such as “სამზარეულოები | Kencho Group” name the category but omit made-to-order/Tbilisi intent. Descriptions are already localized and richer; improve title/H1 specificity without stuffing keywords.
- app/[locale]/opengraph-image.tsx:5–6 generates a Latin-only share card and English alt. File-based metadata wins for the home image: production resolves /{locale}/opengraph-image?05e44d1a2ce54d72, not the kitchen photo declared in layout. The hash is a deployment snapshot, not a URL to hardcode. Child routes currently resolve their own explicit images correctly.
- Category OG alts use pick(cover.alt, locale) at gallery/[slug]/page.tsx:72 and currently fall back to English on all four Georgian/Russian category cards. Grid alts have a separate translation fallback and are localized. Share-image metadata should use the same approved localization strategy.
- lib/convex-gallery.ts:26–27 permits English fallback for missing CMS translations and preserves an explicit empty string. Future CMS content can therefore produce blank/English titles or descriptions while still advertising language alternatives. Current four categories have localized titles/descriptions; this is a publishing-validation gap, not a claim those fields are currently missing.
- Gallery description padding at gallery/[slug]/page.tsx:36–41 has no upper bound after appending; the comment promising under 160 is not enforced. Search snippets have no universal hard character limit; use editorial quality checks rather than treat a character threshold as an indexing rule.
- Retired planner/projects/services/process URLs are redirects, so title/description/canonical/hreflang/OG on an old rendered page are **not applicable**. Their destinations are fully listed above. Unknown slugs are 404, not pages needing commercial metadata.
- Non-HTML routes: /sitemap.xml, /robots.txt, /llms.txt, /ahrefs-analytics.js, /{locale}/opengraph-image, favicon/manifest/verification/image/video/font assets. HTML title/canonical/heading requirements do not apply to these responses. app/actions.ts exports server actions, not a crawlable page route.

### Vector 5 — Exact H1–H3 heading trees

These trees come from initial production HTML, in DOM order. Text is whitespace-normalized; aria-hidden decorative descendants are excluded from the semantic column. No missing separator is silently inserted. Thus STUDIODESIGNED, NEWGOLDENCRAFT and MADETo Live in below record actual adjacent-node concatenation. Visual block layout may separate them for a reader. For the homepage H1, raw textContent additionally appends KENCHOGROUP after the intact sr-only sentence; the visual letters are aria-hidden.

**All 27 indexable pages: exactly one H1. Zero pages with zero H1; zero pages with multiple H1.** An invalid URL's error heading and retired redirect responses are outside this page-content count.

Main-content trees (H1/H2/H3 labels preserve hierarchy; no other main-content H1–H3 nodes exist in the initial state):

| Route | Exact ordered main heading tree |
| --- | --- |
| /ka | H1 Kencho Group — bespoke furniture and millwork in Tbilisi<br>H2 KENCHO IS A BESPOKE MILLWORK STUDIODESIGNED AROUND QUIET LUXURY, WARM TIMBERAND EFFORTLESS LIVING IN TBILISI.<br>H3 NEWGOLDENCRAFT<br>H3 FROM DRAWING TO HOME<br>H3 THE SPACE YOU WANTEDyoursTHIS YEAR<br>H2 PRECISION MILLWORK<br>H2 KENCHO GROUP IS A BESPOKE FURNITURE WORKSHOP IN TBILISI. EVERY PIECE IS MEASURED ON SITE, DRAWN IN 3D, AND BUILT UNDER ONE ROOF.<br>H3 NEW STANDARD OF CRAFT<br>H2 THE MATERIALS — 05<br>H2 MADETo Live in<br>H3 ARCHITECTURAL GRADE UPGRADES & HARDWARE<br>H3 COMMON QUESTIONS<br>H3 DISCUSS YOUR SPACE |
| /ru | H1 Kencho Group — bespoke furniture and millwork in Tbilisi<br>H2 KENCHO IS A BESPOKE MILLWORK STUDIODESIGNED AROUND QUIET LUXURY, WARM TIMBERAND EFFORTLESS LIVING IN TBILISI.<br>H3 NEWGOLDENCRAFT<br>H3 FROM DRAWING TO HOME<br>H3 THE SPACE YOU WANTEDyoursTHIS YEAR<br>H2 PRECISION MILLWORK<br>H2 KENCHO GROUP IS A BESPOKE FURNITURE WORKSHOP IN TBILISI. EVERY PIECE IS MEASURED ON SITE, DRAWN IN 3D, AND BUILT UNDER ONE ROOF.<br>H3 NEW STANDARD OF CRAFT<br>H2 THE MATERIALS — 05<br>H2 MADETo Live in<br>H3 ARCHITECTURAL GRADE UPGRADES & HARDWARE<br>H3 COMMON QUESTIONS<br>H3 DISCUSS YOUR SPACE |
| /en | H1 Kencho Group — bespoke furniture and millwork in Tbilisi<br>H2 KENCHO IS A BESPOKE MILLWORK STUDIODESIGNED AROUND QUIET LUXURY, WARM TIMBERAND EFFORTLESS LIVING IN TBILISI.<br>H3 NEWGOLDENCRAFT<br>H3 FROM DRAWING TO HOME<br>H3 THE SPACE YOU WANTEDyoursTHIS YEAR<br>H2 PRECISION MILLWORK<br>H2 KENCHO GROUP IS A BESPOKE FURNITURE WORKSHOP IN TBILISI. EVERY PIECE IS MEASURED ON SITE, DRAWN IN 3D, AND BUILT UNDER ONE ROOF.<br>H3 NEW STANDARD OF CRAFT<br>H2 THE MATERIALS — 05<br>H2 MADETo Live in<br>H3 ARCHITECTURAL GRADE UPGRADES & HARDWARE<br>H3 COMMON QUESTIONS<br>H3 DISCUSS YOUR SPACE |
| /ka/gallery | H1 კატალოგი |
| /ru/gallery | H1 Каталог |
| /en/gallery | H1 Catalogue |
| /ka/about | H1 ერთი სახელოსნო. ყველაფერი აქ მზადდება.<br>H2 როგორ ვმუშაობთ<br>H3 აზომვა<br>H3 3D დიზაინი<br>H3 დამტკიცება<br>H3 დამზადება<br>H3 მონტაჟი<br>H2 თქვენი ნახაზები — მილიმეტრის სიზუსტით.<br>H2 დავიწყოთ თქვენი პროექტი |
| /ru/about | H1 Одна мастерская. Всё делаем сами.<br>H2 Как мы работаем<br>H3 Замер<br>H3 3D-проект<br>H3 Утверждение<br>H3 Производство<br>H3 Монтаж<br>H2 Ваши чертежи — с точностью до миллиметра.<br>H2 Начнем ваш проект |
| /en/about | H1 One workshop. Every piece made here.<br>H2 How we work<br>H3 Measurement<br>H3 3D design<br>H3 Approval<br>H3 Manufacturing<br>H3 Installation<br>H2 Your drawings, built to the millimetre.<br>H2 Let's start your project |
| /ka/faq | H1 კითხვები, რომლებსაც ყოველი პროექტის წინ გვისვამენ |
| /ru/faq | H1 Вопросы, которые задают перед каждым проектом |
| /en/faq | H1 Questions we hear before every project |
| /ka/contact | H1 დაიწყეთ საუბრით<br>H2 მისამართი<br>H2 ტელეფონი<br>H2 ელფოსტა<br>H2 დავიწყოთ თქვენი პროექტი |
| /ru/contact | H1 Начните с разговора<br>H2 Адрес<br>H2 Телефон<br>H2 Почта<br>H2 Начнем ваш проект |
| /en/contact | H1 Start with a conversation<br>H2 Address<br>H2 Phone<br>H2 Email<br>H2 Let's start your project |
| /ka/gallery/kitchens | H1 სამზარეულოები |
| /ru/gallery/kitchens | H1 Кухни |
| /en/gallery/kitchens | H1 Kitchens |
| /ka/gallery/wardrobes-storage | H1 კარადები და სათავსოები |
| /ru/gallery/wardrobes-storage | H1 Шкафы и системы хранения |
| /en/gallery/wardrobes-storage | H1 Wardrobes & storage |
| /ka/gallery/commercial-spaces | H1 კომერციული სივრცეები |
| /ru/gallery/commercial-spaces | H1 Коммерческие пространства |
| /en/gallery/commercial-spaces | H1 Commercial spaces |
| /ka/gallery/home-interiors | H1 საცხოვრებელი ინტერიერები |
| /ru/gallery/home-interiors | H1 Домашние интерьеры |
| /en/gallery/home-interiors | H1 Home interiors |

Append this shared sequence after each route's main tree. The final H2 exists inside the closed global contact dialog, so it is in raw DOM but not initially visible:

| Locale | Footer H2s, in order | Closed contact-dialog H2 |
| --- | --- | --- |
| ka | რას ვამზადებთ<br>გვერდები<br>დაგვიკავშირდით | დავიწყოთ თქვენი პროექტი |
| en | What we make<br>Pages<br>Enquiries | Let's start your project |
| ru | Что мы делаем<br>Страницы<br>Связаться | Начнем ваш проект |

Heading sources: HeroSection.tsx:222; HorizontalConceptSection.tsx:413,458,519,538; CircleRevealSection.tsx:237; ManifestoMapSection.tsx:258,393; MaterialsIndexSection.tsx:336; EditorialSplitSection.tsx:85,125,226,286; CatalogueShell.tsx:48; PageHeader.tsx:24; about/page.tsx:92,97,112,143; contact/page.tsx:57,64,68; ContactPanel.tsx:11,24; Footer.tsx:31,41,74. All paths under src/components or app as indicated by their filenames earlier.

**Interaction-dependent heading changes:**

- Hero adds one selected hotspot H2: BUILT TO THE MILLIMETRE / EUROPEAN TIMBER & STONE / ONE TEAM, ONE WORKSHOP (HeroSection.tsx:20–44,413).
- Room carousel replaces its H2: PRECISION MILLWORK → ARCHITECTURAL STORAGE → TACTILE TIMBER CLADDING → BESPOKE COMMERCIAL SPACES (CircleRevealSection.tsx:23–64,237). It does not expose all four initially.
- Gallery viewer adds an H2 equal to the localized selected photo heading, falling back to its chapter title (CatalogueViewer.tsx:122). Tested ?p=1 in Georgian kitchens produces “სამზარეულო კაკლისა და ბეტონის ტონებში”. It adds no H1.
- FAQ questions in both the homepage accordion and FaqList are buttons/summary spans, not H2/H3. No extra heading should be inferred from their visual styling. ParallaxQuoteSection uses a blockquote, not a heading.

**Keyword/structure flags:**

| Route family | Finding | Priority |
| --- | --- | --- |
| Home in ka/ru | English H1 and body; visible H1 primarily brand. Intact English fallback is descriptive, so it is inaccurate to say the entire semantic H1 is only Kencho Group | RED R1 |
| /gallery | H1 is only კატალოგი / Catalogue / Каталог | YELLOW: add descriptive catalogue intent |
| /gallery/kitchens | H1 is only სამზარეულოები / Kitchens / Кухни | YELLOW: made-to-order/location intent can be clearer, e.g. სამზარეულოს დამზადება შეკვეთით თბილისში |
| Other gallery categories | Category-only headings omit customization/location | YELLOW: use natural service-specific wording; preserve existing URLs |
| /about | Workshop-focused but does not identify custom furniture/Tbilisi in H1 | Lower-priority editorial opportunity; adjacent localized copy supplies context |
| /faq | Generic project-question H1, localized | Lower-priority: name furniture ordering in the H1 if natural |
| /contact | “Start with a conversation” equivalents rather than contact/business/location | Lower-priority: use a clear contact label and retain conversational supporting copy |

No H1→H3 skipping was found in the initial main trees. Gallery pages have no main H2/H3 after their H1; add useful service/process/material sections if these pages are to serve commercial landing intent. An H1 does not have to contain an exact-match query to be valid, and multiple H1s would not by themselves establish an indexing penalty.

### Vector 6 — Structured data

All observed JSON-LD blocks parsed successfully and were present in server HTML.

| Route family (all three locales) | Current types / counts | Source |
| --- | --- | --- |
| Home | FurnitureStore, including four nested Service offers | layout.tsx:121–124; lib/structured-data.ts:28–82 |
| /gallery | FurnitureStore + BreadcrumbList | gallery/page.tsx:60–63 |
| /about | FurnitureStore + BreadcrumbList | about/page.tsx:56 |
| /faq | FurnitureStore + FAQPage (4 Question/Answer pairs) + BreadcrumbList | faq/page.tsx:48–49; lib/structured-data.ts:87–100 |
| /contact | FurnitureStore + BreadcrumbList | contact/page.tsx:50 |
| Each /gallery/[slug] | FurnitureStore + three-level BreadcrumbList + CreativeWork with gallery images | gallery/[slug]/page.tsx:121–128; lib/structured-data.ts:129–170 |

Nested types also include PostalAddress, GeoCoordinates, OpeningHoursSpecification, City, OfferCatalog, Offer, Service and breadcrumb ListItem. Business @id is https://www.kenchogroup.ge/#business and is referenced by Service.provider and CreativeWork.author. FAQ schema is limited to the dedicated FAQ route and its four matching native-details answers; the homepage has a different hardcoded FAQ set and no FAQPage schema.

**Requested-type status:**

- **LocalBusiness / FurnitureStore: present.** FurnitureStore is a subtype of LocalBusiness; a duplicate generic LocalBusiness node is not missing. [Schema.org hierarchy](https://schema.org/FurnitureStore).
- **Service: present**, four nested entries for kitchens, wardrobes, paneling and commercial work on every page. No distinct page-focused Service entity with a stable service URL exists; add one only alongside substantive corresponding content.
- **FAQPage: present on /faq.** Optional homepage/about schema expansion is not a priority over restoring their visible content. As of this audit date, Google reports the FAQ rich-result feature was discontinued starting May 7, 2026; do not promise FAQ SERP enhancements. [Google documentation updates](https://developers.google.com/search/updates#may-2026).
- **BreadcrumbList: present on every non-home content route**, including gallery hierarchy. Home does not need an artificial breadcrumb chain.
- **Product: absent.** The current gallery is a portfolio of custom work, not a set of purchasable product-detail pages with genuine offers/prices. Absence is not a blocker; do not manufacture Product/Offer/rating values to satisfy a checklist.
- **CreativeWork: present** for each category collection. If individual case studies are later published, model each real work and its relationship to the gallery rather than multiplying duplicate photo URLs.

**Business-data quality gap:** lib/site.ts:72–98 explicitly marks coordinates and opening hours as needing confirmation, yet businessLd emits them. Verify these against the business before retaining/updating them. Placeholder Instagram/LinkedIn values are correctly filtered out of sameAs by structured-data.ts:58; they are not currently emitted as fake social profiles. Server JSON-LD cannot compensate for English-only visible content or unavailable service text.

### Vector 7 — Images, alt text and LCP priority

The current React source uses next/image for every content image callsite found; no raw JSX img tag was found in active page/component source. Root historical HTML captures naturally contain generated img tags and are not application implementations. The 27 live pages contain **396 img elements in total** (counting reused images across routes/locales), **zero missing alt attributes**, and six empty alts: two decorative crops repeated on each homepage locale.

| File / exact image lines | Alt source and locale behavior | Loading / finding |
| --- | --- | --- |
| src/components/HeroSection.tsx:339,352 | Hardcoded English: day oak/travertine kitchen; night LED/walnut kitchen | Day priority at 343; night defaults to lazy. Day preload verified in production |
| src/components/HorizontalConceptSection.tsx:490,638 | Hardcoded English cane wardrobe/bench and commercial lounge descriptions | Responsive sizes; default lazy |
| src/components/CircleRevealSection.tsx:263 | currentRoom.alt from English ROOMS array at 23–64 | Only current slide image initially; lazy and initial animation opacity 0 |
| src/components/ParallaxQuoteSection.tsx:78 | Hardcoded English architectural interior/millwork description | Lazy; Unsplash fallback on error retains branded alt, so fallback photo may no longer match the claim |
| src/components/ManifestoMapSection.tsx:223,239 | Empty alt for two decorative floating crops | Appropriate if decorative; not missing alt |
| src/components/ManifestoMapSection.tsx:336 | Hardcoded English wardrobe/cane description | Lazy |
| src/components/MaterialsIndexSection.tsx:297 | m.alt from five hardcoded English material descriptions | All five images in initial HTML; default lazy; four layers visually hidden |
| src/components/EditorialSplitSection.tsx:116 | Hardcoded English fluted oak/hardware description | Lazy |
| src/components/EditorialSplitSection.tsx:196 | item.title: four English editorial names, e.g. BESPOKE FOREST ISLAND | English and less literally descriptive than ideal; localize accurate visual descriptions |
| app/_components/Catalogue.tsx:127 | page.alt from server lib/catalogue.ts:78–95 | First four eager at 133, rest lazy; no priority/preload on grid |
| app/_components/CatalogueViewer.tsx:112,161 | page.alt for overview/current image; empty alt for adjacent inactive images, whose slide ancestor is aria-hidden | Eager within viewer; intentionally suppressed neighbor duplicate announcements |
| app/_components/PageHeader.tsx:28 | image.alt supplied by server page; About uses translated about.videoTitle | preload set; active about hero passes |

**Gallery localization passes today:** /ka/gallery has 56 nonempty alts containing Georgian characters; /ru/gallery has 56 containing Cyrillic; /en/gallery has 56 nonempty alts. These script checks do not certify translation quality or keyword selection, but disprove blanket claims that current Georgian gallery alts are empty/English. The four categories contain 27 kitchens, 12 wardrobes/storage, 9 commercial and 8 home-interior images, respectively.

The exact fallback chain is lib/catalogue.ts:78–95: locale-specific nonblank CMS alt → translatedPhotoTitle from lib/gallery-titles.ts → pick(CMS alt, locale), usually English. Headings strip the importer suffix after “ — ”. Captions deliberately require the requested locale and may be omitted when untranslated. Chapter cover alts (catalogue.ts:146–155) and metadata OG alts use pick directly, bypassing the photo-title map; current ka/ru category OG images therefore have English alts even though the grid is localized. Require complete CMS translations for newly published records and avoid relying forever on an English-title lookup.

Legacy image callsites were also inspected; they are not evidence of current homepage output:

| Unmounted component / image lines | Alt strategy |
| --- | --- |
| app/_components/Hero.tsx:27 | Localized home.heroAlt, eager/high-priority fetch settings |
| app/_components/Arrival.tsx:372 | Localized chapters.{i}.alt; eager, first fetchPriority high |
| app/_components/DetailStrip.tsx:75 | alts[i] prop supplied by former parent |
| app/_components/FocusStrip.tsx:127 | Empty alt on a decorative linked cover with aria-hidden ancestor |
| app/_components/HomeFilm.tsx:170 | Localized film.description or ownerAlt |
| app/_components/HomeServices.tsx:34 | Empty alt alongside localized service name; review decorative intent if reused |
| app/_components/LatestWork.tsx:94 | Empty alt for hover preview; text link identifies project |
| app/_components/ProjectTiles.tsx:351,411,466,528 | Localized alt helper; inactive slide at 468 deliberately empty |
| app/_components/SelectedWork.tsx:37 | page.alt from server catalogue |

**LCP answer:** The homepage hero already sets priority, and the live HTML includes its image preload. It is inaccurate to flag missing priority. Next.js 16 deprecates priority in favor of preload; changing the prop is maintenance, not proof of a present performance failure (installed image.md:265–293). About's PageHeader already uses preload. Gallery first-row images are eager rather than preloaded; measure the actual LCP element before prioritizing one. The homepage opening foreground is text and a curtain, with the kitchen initially translated offscreen, so the hero is not necessarily the initial LCP candidate. A preload cannot fix the choreography's visibility delay. Avoid preloading every gallery/material image. Also review the many font preloads from lib/fonts.ts if performance profiling shows contention.

**Asset delivery:** next.config.ts:21–29 permits Convex storage and Unsplash remote images and configured qualities. The production grids render optimized image URLs and sizes. HeroSection.tsx:47–50 and ParallaxQuoteSection.tsx:11–12 contain stock-photo error fallbacks; those retain Kencho-specific alts and should be replaced with an accurate fallback strategy. Asset filename keywords are not a substitute for localized, accurate alt text.

### Cross-vector architecture priorities

The site already has localized category URLs and descriptive metadata; do not create overlapping thin /services and /gallery pages simply to increase URL count. Enrich the existing kitchens, wardrobes/storage, commercial and home-interior category pages with unique service scope, material choices, process, real lead-time information, examples and localized FAQs. A dedicated wall-paneling route is absent; it is currently a subtopic under home interiors and an interaction-gated home slide. Create a separate service page only if there is enough distinct, approved content and search intent. The retired planner no longer exists; its 308 is intentional, so a “planner has zero H1” diagnosis would be wrong.

Existing scripts/verify-seo.mjs checks status, H1 count, metadata and schema, but its main content checks cover only the kitchens dynamic route and fixed static routes. It does not establish translated body content, all interaction-independent service/FAQ text, all current CMS categories' semantics, or real-space preservation in split headings. Its comment still refers to app/sitemap.ts. Extend that verifier in the implementation phase to catch these actual regressions.

## 3. File-by-File Action Plan

All entries below are proposed next-step edits, not changes performed by this audit. Paths are exact repository-relative paths under C:/Users/khvic/Desktop/kencho-group. Keep the healthy canonical/locale routing and existing URL equity while fixing the content first.

| Order / impact | File(s) to edit or create | Concrete change | Acceptance evidence |
| --- | --- | --- | --- |
| 1 / RED | src/components/HeroSection.tsx; messages/home-ka.json; messages/home-en.json; messages/home-ru.json | Translate visible hero/semantic H1, subcopy, hotspots and alts; render all essential hotspot descriptions persistently; keep decorative letters aria-hidden with an intact localized equivalent | Georgian/Russian commercial H1 and descriptive paragraphs present in initial HTML without interaction |
| 2 / RED | src/components/CircleRevealSection.tsx | Localize all four services and alts; render service descriptions/headings independently of activeIdx, with animations enhancing a complete semantic representation | All four service descriptions appear in initial parsed DOM; no click/swipe required |
| 3 / RED | src/components/EditorialSplitSection.tsx; app/_components/FaqList.tsx (reuse pattern) | Localize specs, case-study captions, FAQ/conversion copy; keep all answers mounted or use native details; preserve whitespace in MADE / To Live in heading | Four homepage answers available without JS; matching visible/accessibility text and localized alts |
| 4 / RED | src/components/HorizontalConceptSection.tsx | Localize all concept headings/copy and image alts; add real word boundaries/intact semantic text around line and word animations | No STUDIODESIGNED, TIMBERAND or NEWGOLDENCRAFT in the intended reading sequence; accessible whole phrases |
| 5 / RED | src/components/ManifestoMapSection.tsx; src/components/MaterialsIndexSection.tsx; src/components/ParallaxQuoteSection.tsx; src/components/FixedHudFrame.tsx | Translate the remaining mounted sections and UI; use CSS spacing for display letters; retain GSAP aria=auto behavior and accurate decorative alt decisions | /ka, /ru and /en body text differs appropriately; all five material captions preserve full labels after splitting |
| 6 / HIGH | app/[locale]/page.tsx; app/globals.css | If needed, split semantic server content from client animation wrappers; provide usable static/reduced-motion content and a non-blocking hero presentation | Compare initial HTML, no-JS rendering and hydrated rendering; one H1; no core text dependent on scrolling/clicks |
| 7 / HIGH | messages/ka.json; messages/en.json; messages/ru.json; app/_components/CatalogueShell.tsx; app/[locale]/(pages)/gallery/[slug]/page.tsx; app/[locale]/(pages)/gallery/page.tsx | Improve gallery H1/title intent and add substantive localized service sections to existing routes; keep metadata/visible content aligned | Complete unique service text, good headings, self-canonical and reciprocal alternatives on each category |
| 8 / HIGH | lib/convex-gallery.ts; lib/catalogue.ts; lib/gallery-titles.ts; app/[locale]/(pages)/gallery/[slug]/page.tsx | Define complete locale publishing requirements and consistent alt/OG fallback; avoid empty-string or English metadata silently claiming a complete translation | All titles/descriptions/grid alts/OG alts localized; add/update real CMS translations through the separate admin workflow |
| 9 / MEDIUM | src/components/HorizontalConceptSection.tsx; src/components/ManifestoMapSection.tsx; src/components/EditorialSplitSection.tsx | Finish manual phrase/line accessibility treatment and source spaces after localization | Initial text and accessible text read as intact phrases; no duplicate semantic announcements |
| 10 / MEDIUM | app/sitemap.xml/route.ts; next.config.ts; lib/convex-gallery.ts | Handle CMS failures without publishing a reduced 200 sitemap; use actual content modification dates (requires updatedAt in the upstream contract) | Normal sitemap still has 3×(5+published categories); transient failures do not silently remove galleries |
| 11 / MEDIUM, if regional targeting chosen | i18n/routing.ts; app/[locale]/layout.tsx; lib/page-metadata.ts; app/[locale]/(pages)/gallery/[slug]/page.tsx; app/sitemap.xml/route.ts; scripts/verify-seo.mjs | Centralize emitted language tags; optionally use ka-GE consistently while retaining /ka URL paths and direct x-default | Exact reciprocal language set in HTML and sitemap; all targets 200; no contradiction with HTTP Link headers |
| 12 / MEDIUM | lib/site.ts; lib/structured-data.ts | Confirm coordinates/hours; retain truthful FurnitureStore/Service/FAQ/Breadcrumb markup; add page-focused Service entities only with matching content | Valid JSON-LD describing actual visible offerings and verified business facts; no fabricated Product offers |
| 13 / MEDIUM | app/[locale]/opengraph-image.tsx; app/[locale]/layout.tsx; lib/page-metadata.ts | Decide intentional locale-aware OG card/alt policy and account for file-based metadata precedence | Expected card and localized alt in resolved HTML; title/locale remain consistent |
| 14 / LOW–MEDIUM | src/components/HeroSection.tsx; src/components/ParallaxQuoteSection.tsx; app/_components/Catalogue.tsx; lib/fonts.ts | Replace deprecated priority with the justified loading strategy; remove misleading stock-photo fallback branding; tune actual LCP resource/font loading after measurement | Measured LCP improvement with no excess preloads; accurate image descriptions and static fallback |
| 15 / LOW | messages/ka.json; messages/en.json; messages/ru.json; app/[locale]/(pages)/about/page.tsx; app/[locale]/(pages)/faq/page.tsx; app/[locale]/(pages)/contact/page.tsx | Refine generic secondary-page H1s where useful, keeping native FAQ and contact semantics | Natural page-purpose headings in all locales; no heading-count regression |
| 16 / VERIFICATION | scripts/verify-seo.mjs | Extend current checks to every published slug/locale, localized body scripts, intact split-text boundaries, initial service/FAQ content, query canonicals and redirect cases | All current sitemap pages pass real-content checks, not just tag-presence checks |
| 17 / OPTIONAL NEW CONTENT | app/[locale]/(pages)/services/wall-paneling/page.tsx (new only if justified); lib/structured-data.ts; locale dictionaries; sitemap and navigation sources | A distinct approved wall-paneling service page, if existing home-interiors content cannot cover that intent adequately | Unique substantive content and internal links; no thin duplicate competing with the gallery |

**External dependency for CMS edits:** lib/convex-gallery.ts:3–12 states that the public gallery queries/database live in the separate kenchogroup-admin repository. Its backend files are not present here. Do not pretend a storefront dictionary edit updates published category records or guess an uninspected admin file path. Coordinate translation/update-timestamp validation there during implementation.

**Evidence needed for the 127 count:** obtain the original crawler's 127-URL export with status, canonical, content type, discovery source and crawl date. Reconcile it before editing proxy.ts, next.config.ts redirects or robots.ts. No such routing/robots change is justified solely by this number.

**Verification record:** 27/27 sitemap HTTP 200; 27/27 one H1; 27/27 one self-canonical; 27/27 expected reciprocal ka/en/ru/x-default links; 27/27 index/follow; all JSON-LD parsed; raw gallery grids contain all current photos; cookie-free 307 locale negotiation and tested 308 host/retired/trailing-slash normalization; real 404 for unknown gallery and non-public HTML capture; clean canonicals on tested query variants; all five hydrated SplitText captions have complete labels and hidden generated words. Source and live observations were compared; no fresh local production build was run to preserve the requested read-only application audit.
