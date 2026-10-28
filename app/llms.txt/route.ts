import { fetchQuery } from "convex/nextjs";
import { galleriesApi } from "@/lib/convex-gallery";
import { SITE } from "@/lib/site";
import en from "@/messages/en.json";

/*
 * /llms.txt — the site, summarised for answer engines.
 *
 * English throughout: it is the pivot language of the message files and
 * the one every model reads reliably; the links carry a note that every
 * page also exists in Georgian (/ka) and Russian (/ru).
 *
 * Assembled from the same sources the pages read — messages/en.json,
 * lib/site.ts, and the published galleries in Convex — so it cannot
 * drift from what the site actually says. Regenerated hourly.
 */

export const revalidate = 3600;

const SERVICE_IDS = ["kitchens", "wardrobes", "paneling", "commercial"] as const;

export async function GET() {
  const services = SERVICE_IDS.map((id) => {
    const item = en.services.items[id];
    return `- **${item.name}** — ${item.line}`;
  }).join("\n");

  let galleriesSection = "";
  try {
    const galleries = await fetchQuery(galleriesApi.listPublishedSlugs, {});
    if (galleries.length > 0) {
      galleriesSection = [
        "",
        "## Catalogue chapters",
        "",
        ...galleries.map((g) => {
          const line = g.description?.en ? `: ${g.description.en}` : "";
          return `- [${g.title.en}](${SITE.url}/en/gallery/${g.slug})${line}`;
        }),
      ].join("\n");
    }
  } catch {
    // Convex unreachable — ship the static half rather than a 500.
  }

  const hours = SITE.openingHours
    .map((spec) => `${spec.days.join(", ")}: ${spec.opens}–${spec.closes}`)
    .join("; ");

  const body = `# ${SITE.name}

> ${en.meta.description}

${en.commercial.scope} ${en.commercial.coverage}
${en.commercial.start}

## Design Fees & Quotation Policy

- ${en.commercial.furnitureFee}
- ${en.commercial.interiorFee}
- ${en.commercial.quote}

## Production Timeline (~2 Months / 6–8 Weeks)

${en.commercial.timeline}

- **01. ${en.process.steps.s1.title}**: ${en.process.steps.s1.line}
- **02. ${en.commercial.stages.design.title}**: ${en.commercial.stages.design.text}
- **03. ${en.commercial.stages.review.title}**: ${en.commercial.stages.review.text}
- **04. ${en.commercial.stages.materials.title}**: ${en.commercial.stages.materials.text}
- **05. ${en.commercial.stages.installation.title}**: ${en.commercial.stages.installation.text}

## Materials, Partners & Technical Capabilities

- **Suppliers & Processing Partners**: ${en.commercial.suppliers}
- **Technologies & Metalwork**: ${en.commercial.technical}

## Services

${services}

## Key pages

Every page is available in Georgian (/ka), Russian (/ru) and English (/en):

- [Production process & deadlines](${SITE.url}/en/process): five stages, realistic lead times and specialist finishing allowances
- [Design & pricing](${SITE.url}/en/design-pricing): design fees, measurement methods and project quotation scope
- [Materials & technologies](${SITE.url}/en/materials): suppliers, processing services, CNC routing and metal fabrication

- [Home (KA)](${SITE.url}/ka) | [Home (EN)](${SITE.url}/en) | [Home (RU)](${SITE.url}/ru)
- [Custom Kitchens — #1 Priority (KA)](${SITE.url}/ka/gallery/kitchens) | [EN](${SITE.url}/en/gallery/kitchens) | [RU](${SITE.url}/ru/gallery/kitchens)
- [Built-in Wardrobes & Storage (KA)](${SITE.url}/ka/gallery/wardrobes-storage) | [EN](${SITE.url}/en/gallery/wardrobes-storage) | [RU](${SITE.url}/ru/gallery/wardrobes-storage)
- [Wall Panelling & Home Interiors (KA)](${SITE.url}/ka/gallery/home-interiors) | [EN](${SITE.url}/en/gallery/home-interiors) | [RU](${SITE.url}/ru/gallery/home-interiors)
- [Commercial Spaces (KA)](${SITE.url}/ka/gallery/commercial-spaces) | [EN](${SITE.url}/en/gallery/commercial-spaces) | [RU](${SITE.url}/ru/gallery/commercial-spaces)
- [Full Catalogue](${SITE.url}/en/gallery): photographs of finished kitchens, wardrobes, interiors and commercial fit-outs
- [About us](${SITE.url}/en/about): how a project runs from Pinterest photo or drawings to installation
- [FAQ](${SITE.url}/en/faq): design fees (30 GEL/m² front elevation, $15–20/m² floor area), 2-month timeline, materials and suppliers
- [Contact](${SITE.url}/en/contact): WhatsApp and phone consultation
${galleriesSection}

## Contact

- Phone / WhatsApp: ${SITE.phone}
- Email: ${SITE.email}
- Address: ${SITE.address.street}, ${SITE.address.city}, Georgia
- Hours: ${hours}
- Facebook: ${SITE.socials.facebook}
- TikTok: ${SITE.socials.tiktok}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
