# Kencho Group landing page audit — 11 October 2026

The current landing page has a useful visual foundation and photographs worth showing. My professional assessment is that it is underprepared to earn enquiries for 10,000–50,000 GEL furniture projects. It provides a way to browse examples, but leaves too many questions about delivery, quality, cost and accountability unanswered on the landing page itself.

This is an expert review of the current local implementation, not a measured conversion study. Priority reflects the likely effect on a serious prospective client. No conversion uplift is promised.

**Scope and evidence.** Inspected the landing page at localhost:3000 with its menu, language controls and enquiry drawer. Rendered English and Georgian at 1440×900; Georgian at 1366×768 and 390×844; English at 390×844 and on an 820×1180 touch tablet; Russian at 360×800. Reviewed the corresponding components, copy, styles, catalogue loading and enquiry handling. No inner page layouts were audited. The initial desktop/mobile inspection found no page JavaScript exceptions or HTTP responses with status 400 or higher. Production loading speed and delivery of a real enquiry were not tested.

**1. Critical — the hero does not make the next step obvious.**

The header contains only the brand and Menu. The hero contains a general statement and category links. There is no direct enquiry action in either. A visitor who wants to discuss a substantial project must open the menu or reach the footer. At 1440×900, the Georgian footer enquiry button begins around 5,786 pixels down; on the 390×844 phone it begins around 3,548 pixels down. The menu provides a shorter route, but that route is concealed until the visitor opens it.

Use a visible “Request an estimate” action in the header and hero, with a quieter “View completed projects” alternative. State what happens after the click and when the visitor will receive a response. Let the existing contact drawer support this action. A mobile contact control can stay available while scrolling if it does not obstruct content.

**2. Critical — the offer is generic and occupies too much attention.**

“We make furniture that's made to measure, to fit the way you live” communicates custom furniture, but offers little distinction between Kencho and competing workshops. It does not immediately name kitchens, fitted wardrobes or complete furniture packages. The Georgian version breaks into eight lines in the inspected desktop and phone views. The city sits separately near the bottom of the copy area.

A stronger working direction is “Custom kitchens and fitted furniture in Tbilisi,” followed by a short explanation of measurement, design, manufacture and installation by one team. Mention that clients can bring a designer's drawings. Final Georgian copy should be edited for natural language and then designed at its actual length. Keep the service scope, location, proof image and action together.

**3. Critical — attractive photographs need project context to establish trust.**

The landing page shows photographs and descriptive names, but no complete case study. It does not identify what Kencho was responsible for, the approved specification, the completed scope, the project duration or a relevant budget range. The same green kitchen and cane wardrobe recur in the hero, category covers and work list. Repetition increases exposure to those examples without adding much evidence.

Show three selected completed projects with a large photograph, a detail photograph and a short fact strip. Use verified facts: area/neighbourhood if permission allows, scope, materials/hardware, completion time and actual budget or an honest range. A designer drawing or render beside the installed result is particularly useful evidence for the promise to execute a design. Avoid invented project counts, testimonials, guarantees or budgets.

**4. Critical — the buying questions remain unanswered on the landing page.**

There is no visible budget guidance, production timeframe, installation timeframe, warranty duration, payment outline, aftercare explanation or clear list of what the quote includes. The current “How we work” paragraph is useful, but too general to address a large purchase. Some information already exists in the translation files, yet is not presented on this landing page.

Include a short set of practical answers: how an estimate is prepared; what affects cost; whether design, delivery and installation are included; expected production and installation timing; deposit/payment stages; warranty coverage and duration. Publish only confirmed terms. The user's 10,000–50,000 GEL description establishes the target buying situation; it is not sufficient evidence to publish a universal minimum or pricing promise.

**5. High — the category sequence consumes attention before the value proposition is developed.**

On the 1440×900 desktop, the category section starts at y=900 and consumes approximately 2,801 pixels of vertical scroll through its pinned horizontal sequence. “How we work” starts at y=3,701. The first three sections therefore require more than four viewport heights of scroll before the explanation of responsibility even begins. On touch devices the same content becomes a horizontal swipe. A visitor can skip later categories unintentionally.

Use a normal vertical layout with clearly visible category choices and selected projects. Keep motion brief and subordinate to reading. If a horizontal gallery is retained, provide explicit previous/next controls, reliable keyboard behavior and an easy route past it. The touch tablet currently says “Scroll to explore” even though vertical scrolling does not advance the unpinned horizontal track.

**6. High — “Latest work” conceals the evidence it is supposed to present.**

Desktop photographs appear only in a floating preview when the pointer enters a row. This makes visual inspection depend on discovering a hover interaction and can cover the information being read. CSS hides the preview on phones and under 1024px, leaving a furniture portfolio as a text list. Georgian captions are absent, creating especially empty rows. English captions are constrained to one line and truncated.

Show a photograph permanently for every featured project. Use a restrained grid or an editorial row with a fixed thumbnail and two concise facts. Additional hover effects can enhance a usable default. Also, the data function named loadLatest takes the first items from an interleaved catalogue list, ordered by editorial position; it does not sort by completion/publication date. Rename the section “Selected work” or supply actual chronological data.

**7. High — localization is visibly incomplete.**

Georgian headings surround English project names such as “Green island kitchen” and “Cane entryway wardrobe.” The landing page's selected Georgian work has no captions. The code explicitly falls back to English names and omits captions missing in the visitor's language. The result feels unfinished in the primary local market. Hero image alternative text is also English regardless of locale.

Translate client-facing project names and descriptions in the content system. Validate Georgian and Russian independently, including long words and smaller screens. Place the language switch where a visitor can find it immediately. In the initial Georgian phone menu its language controls start around y=990, below the 844px viewport, so reaching them requires scrolling inside the menu.

**8. High — several responsive layouts remove useful content.**

The Georgian Kitchens tile in the desktop hero clips its label and arrow at both 1440 and 1366 widths. The category footer lays a large heading and description side by side in a narrow space. On the 390px Georgian phone, the Kitchens description computes to zero pixels wide; the Home interiors description is about four pixels wide. Other descriptions become very narrow columns. On desktop the Georgian kitchen description also becomes a narrow, truncated column.

Stack the title and description on small panels. Reserve width for the copy instead of relying on flex shrink. Use shorter project links or fewer links per category, since the mobile links currently appear as fragments such as “Green isl…” and “Walnut a…”. All public copy should remain legible without guessing.

**9. Medium — the visual hierarchy is energetic, but insufficiently controlled for the intended experience.**

The cream/sand backgrounds and plain typography provide a good base. However, oversized copy, bright orange and green blocks, small cropped photographs and several different browsing treatments compete for attention. On desktop the individual hero photo tiles are only about 155px wide, limiting inspection of craftsmanship. The collage leaves considerable empty space while keeping the actual work small. The statement has substantial padding above and below a relatively narrow text block.

Give a single strongest project a generous image area in the hero. Use a consistent content width and spacing scale. Select one dominant action color and keep the main backgrounds quiet unless the existing brand calls for a stronger palette. White space should help group and scan related information. It should not separate the service explanation from its action or push substantive information unnecessarily far down the page. The brand pill is legible, but the header's most prominent control is currently the menu rather than an enquiry.

**10. Medium — the process makes strong promises without corresponding evidence.**

“Exactly what arrives” and “to the millimetre” are strong claims. The homepage does not show an approved drawing, a material schedule, a construction detail or a finished comparison that substantiates them. It also contains no identifiable customer feedback, workshop/team introduction or visible warranty terms.

Support the promises with a compact drawing-to-installation example, actual workshop or owner footage, close-ups of hardware and finishing, and genuine customer feedback. Describe the agreed dimensions, materials and finishes plainly. Confirm any absolute promises against real contract and change-request practices.

**11. High — keyboard navigation does not reliably match the visible interface.**

Opening the menu leaves keyboard focus on the header button. Continued Tab navigation escapes the menu and enters links in the obscured landing page. The background is not made inert while the menu is open. The trigger also lacks an expanded state and a relationship to the controlled overlay. Escape does close the menu.

A separate test focused the fourth category's first link while the strip was pinned at its starting position: the active link remained at x≈1,939 on a 1,440px viewport. It was completely offscreen. Thus keyboard users can focus an item they cannot see. Use an appropriate overlay/dialog pattern with focus entry, containment, restoration and background inertness, and bring active category content into view. W3C's [modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) explains the expected keyboard behavior.

**12. Medium — small white text on orange has insufficient contrast.**

White against the configured #f25c1a orange measures approximately 3.32:1. The category links and descriptions are normal-sized text; WCAG AA requires at least 4.5:1 for that text. Large headings have a different threshold and should not be grouped with the smaller copy. Darken the orange or change the text color. See [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**13. Medium — the enquiry drawer needs interaction polish and delivery verification.**

The drawer offers sensible options: WhatsApp, phone, and a short callback form. It gives a one-business-day response expectation. However, scrolling upward over its backdrop moved the page behind it from y=5,168 to y=4,539 in a desktop test. Lock background scrolling while leaving drawer content scrollable. A blank-name submission correctly displayed an invalid state, but did not focus the erroneous field; focus ended on the document body. Associate error text with the field and announce it clearly.

The contact interface prominently asks the visitor to mention an internal KG reference code when calling. Keep attribution automatic where possible and avoid making it part of the client's task. The callback submit says only “Send”; a label such as “Request a callback” describes the actual outcome more clearly. The phone placeholder assumes a local Georgian number even in other languages; show the accepted international format if foreign clients are in scope.

No Telegram delivery credentials or webhook destination are defined in the inspected .env.local. That does not establish the production environment's state. The server correctly returns a delivery error when all channels fail. Confirm the deployed channel and run one controlled delivery test with authorization before relying on the form for clients; do not infer delivery from visual form success alone.

**14. Medium — landing-page resilience and measurement have gaps.**

The home page awaits both CMS-fed category highlights and selected work without an error fallback. If those queries fail during rendering, the otherwise independent hero and process content can fail with them. Add a graceful fallback so contact and core buying information remain available.

The existing analytics helper is called for contact actions inside the drawer, but raw phone/WhatsApp links in the footer bypass it. The OpenCatalogue event is defined in the helper but no longer called by the hero. Reconnect enquiry and portfolio interactions, and distinguish contact intent from an enquiry actually received. This review did not validate production analytics configuration.

**What should survive the rebuild.**

Keep the photographed work, warm neutral base, restrained typography, real phone/address, direct WhatsApp option, short callback form, multilingual infrastructure and server-rendered catalogue content. These are useful foundations. In particular, the simple contact drawer is worth refining and making easier to reach.

**Recommended landing-page sequence.**

1. Clear service/location headline, concise responsibility statement, a large completed-project photograph and visible estimate action. Provide language access immediately.
2. Three selected completed projects with permanent photographs and verified scope/material/time/budget facts. Make furniture categories easy to scan nearby.
3. Four short process stages, identifying the client decision and Kencho responsibility at each stage.
4. Compact evidence of workmanship and accountability: approved drawing versus installation, materials/hardware detail, verified warranty and genuine customer feedback.
5. Four to six buying questions covering cost, timing, included work, designer plans, payments and aftercare.
6. A direct invitation to send plans or request a callback, the response expectation, then the practical footer.

The goal is an immediately understandable first screen and a landing page that helps a visitor make an informed enquiry without exploring several other pages. Minimalism means presenting useful information with a clear hierarchy and low interaction effort.

**Build order.** First settle the hero's offer and visible contact action. Next select three real projects and collect their facts. Then replace the pinned category journey and hover-only portfolio with visible proof. Add process and buying answers. Finally verify translations, responsive copy, contrast, keyboard behavior, background scroll lock, CMS fallback, enquiry delivery and tracking. Decorative animation should follow a useful and reliable page.

**Visual evidence.**

- [Georgian desktop hero: long headline and clipped Kitchens label](landing-page-audit-2026-10-11/desktop-ka-hero.png)
- [Georgian desktop category panels: English names and narrow description](landing-page-audit-2026-10-11/desktop-ka-strip.png)
- [Georgian mobile category: description collapsed out of view](landing-page-audit-2026-10-11/mobile-ka-strip.png)
- [Georgian mobile selected work: text rows without photographs](landing-page-audit-2026-10-11/mobile-ka-latest.png)
- [Georgian mobile menu: large categories precede practical navigation](landing-page-audit-2026-10-11/mobile-ka-menu.png)
- [Pinned category track with a focused link outside the viewport](landing-page-audit-2026-10-11/desktop-keyboard-category.png)
- [Desktop enquiry drawer](landing-page-audit-2026-10-11/desktop-en-contact.png)
