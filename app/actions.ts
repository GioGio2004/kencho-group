"use server";

import { SITE } from "@/lib/site";

export type LeadState = {
  ok: boolean;
  /**
   * `delivery` means the lead was VALID but could not be handed to
   * anyone. Deliberately distinct from a validation error: the visitor
   * did nothing wrong and has to be sent somewhere that works.
   */
  error?: "name" | "phone" | "delivery";
};

/* =====================================================================
 * THE LEAD FORM.
 * ---------------------------------------------------------------------
 * This used to validate, `console.log`, and return `{ ok: true }`. The
 * visitor was told "we'll be in touch shortly" and nobody was notified —
 * every lead this form has ever taken went to a server log and died
 * there. It is the most expensive bug the site could have, because it
 * fails silently and looks like success from both ends.
 *
 * It delivers now, over whichever channel is configured:
 *
 *   LEAD_TELEGRAM_BOT_TOKEN + LEAD_TELEGRAM_CHAT_ID
 *       A Telegram message. First choice for this market: it is where
 *       the workshop already reads its messages, it is free, and it
 *       arrives instantly. Create a bot with @BotFather, add it to a
 *       group, read the chat id from getUpdates.
 *
 *   LEAD_WEBHOOK_URL
 *       A JSON POST, for anything else — Zapier, Make, a Google Apps
 *       Script bound to a Sheet, an internal endpoint.
 *
 * AND IF NEITHER IS SET, IT SAYS SO. An unconfigured form returns
 * `error: "delivery"` and the UI points at WhatsApp, which demonstrably
 * works. A form that cannot deliver must never render a thank-you:
 * losing a lead is bad, and telling someone you have it when you do not
 * is worse.
 * ================================================================== */

/** Enough to notice a dead endpoint, not enough to hang the submit. */
const DELIVERY_TIMEOUT_MS = 6000;

type Lead = {
  name: string;
  phone: string;
  at: string;
  /** Has a designer's project — the strongest buying signal we can ask for. */
  designer: boolean;
  note: string;
  /** The catalogue page they asked about, if they came from one. */
  about: string;
  /** Attribution: the visitor's KG-#### code and first-touch ?ref / utm tag. */
  code: string;
  source: string;
  page: string;
  locale: string;
};

async function toTelegram(lead: Lead): Promise<boolean> {
  const token = process.env.LEAD_TELEGRAM_BOT_TOKEN;
  const chat = process.env.LEAD_TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;

  const text = [
    `${SITE.name} — new lead ${lead.code}`,
    ``,
    `Name:     ${lead.name}`,
    `Phone:    ${lead.phone}`,
    `Designer: ${lead.designer ? "yes — has a designer's project" : "no"}`,
    lead.note ? `Note:     ${lead.note}` : null,
    lead.about ? `About:    ${lead.about}` : null,
    ``,
    `Code:     ${lead.code}`,
    `Source:   ${lead.source || "direct"}`,
    `Page:     ${lead.page}`,
    `Language: ${lead.locale}`,
    `Time:     ${lead.at}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text }),
    signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
  });
  return res.ok;
}

async function toWebhook(lead: Lead): Promise<boolean> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return false;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // `site` is the origin; the lead's own `source` is its ?ref / utm tag.
    body: JSON.stringify({ site: SITE.url, ...lead }),
    signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
  });
  return res.ok;
}

export async function submitLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (name.length < 2) return { ok: false, error: "name" };
  if (!/^[+\d][\d\s\-()]{6,}$/.test(phone)) return { ok: false, error: "phone" };

  /* Free text from the visitor — bounded, so a pasted essay cannot bloat
   * the Telegram message past its 4096-character limit. */
  const field = (key: string, max: number) =>
    String(formData.get(key) ?? "").trim().slice(0, max);

  const lead: Lead = {
    name: name.slice(0, 80),
    phone: phone.slice(0, 32),
    at: new Date().toISOString(),
    designer: formData.get("designer") === "on",
    note: field("note", 600),
    about: field("about", 160),
    code: field("code", 12),
    source: field("source", 80),
    page: field("page", 200),
    locale: field("locale", 4),
  };

  /*
   * Every configured channel is tried and ANY success counts. A workshop
   * with both a Telegram group and a sheet should get the lead in both,
   * and should still get it when one of them is down.
   */
  const results = await Promise.allSettled([toTelegram(lead), toWebhook(lead)]);
  const delivered = results.some((r) => r.status === "fulfilled" && r.value);

  if (!delivered) {
    /* Still logged, so a lead stays recoverable from the deployment logs
     * while a channel is being set up — but the visitor is TOLD. */
    console.error(
      `[lead] UNDELIVERED — no channel configured, or all failed. ${lead.at} ${lead.code} ${name} ${phone}`,
      results
        .filter((r) => r.status === "rejected")
        .map((r) => String((r as PromiseRejectedResult).reason)),
    );
    return { ok: false, error: "delivery" };
  }

  return { ok: true };
}
