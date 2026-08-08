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
        "## Project galleries",
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

${SITE.name} is a custom furniture workshop in ${SITE.location}. One team
handles the full project: site measurement, 3D design, production in our own
workshop, delivery and installation.

## Services

${services}

## Key pages

Every page is available in Georgian (/ka), Russian (/ru) and English (/en);
the English URLs are listed.

- [Home](${SITE.url}/en): who we are and what we make
- [Projects](${SITE.url}/en/projects): portfolio with before/after transformations
- [Services](${SITE.url}/en/services): kitchens, wardrobes, wall paneling, commercial fit-outs
- [Gallery](${SITE.url}/en/gallery): photo galleries of finished projects
- [Process](${SITE.url}/en/process): how a project runs from measurement to installation
- [FAQ](${SITE.url}/en/faq): prices, timelines, materials, warranty, service area
- [Kitchen planner](${SITE.url}/en/planner): free interactive kitchen planning tool
- [Contact](${SITE.url}/en/contact): free consultation
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
