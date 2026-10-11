# Landing page rebuild — 11 October 2026

The landing page now leads with the furniture, the workshop and a direct way to start a conversation. Prices, production durations, payment stages and warranty promises are omitted. Enquiries use WhatsApp and phone; the callback form is removed from the public interface.

The page presents a hero photograph, three selected pieces, four furniture categories, a short four-step approach, an interactive detail strip, the people behind the work, three useful questions and a closing contact invitation. All three languages have complete landing-page copy.

The two video references inform the expanding photo strip, circular cursor controls and split gallery viewer. Desktop visitors see the full photograph beside a detail view; phone visitors start with the full photograph and can switch to a crop. Previous/next buttons, swipe, keyboard arrows and Escape work alongside the cursor interaction. Reduced motion disables moving transitions and smooth scrolling.

The selected landing photographs are curated from existing site assets rather than labelled as the latest projects. Gallery content remains in the existing CMS. Known photograph titles have Georgian and Russian fallbacks when the CMS lacks a translation. Navigation has a bounded CMS request and local fallback links, so a failed navigation query cannot prevent the landing page from loading.

Menu and contact dialogs contain keyboard focus, return it on close and lock background scrolling. Nested dialogs share the lock. Gallery links support a photograph index, browser Back and referral parameters. Contact links record intent consistently, including the footer.

Validation commands:

- `npm run lint`
- `npm run build`
- `npm run verify:landing` against the production server on port 3100
- `npm run verify:seo` against the production server on port 3100

The landing checks cover six widths from 320px to 1920px in Georgian, Russian and English, gallery and contact interactions, focus and scroll locking, reduced motion, enquiry tracking, and working contact links with JavaScript disabled. Screenshots are saved beside the original audit in `docs/landing-page-audit-2026-10-11/`.

Final results: build and lint passed; the complete landing regression suite passed with no browser errors or failed local asset requests; all 28 SEO checks passed. The SEO verifier now checks the current public routes and published galleries rather than expecting retired pages in the sitemap. Vercel analytics loads only in its hosting environment.

This is a local implementation. The future admin lead inbox is outside this change; WhatsApp and phone are the delivery paths for now.
