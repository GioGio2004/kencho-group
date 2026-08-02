"use server";

export type LeadState = {
  ok: boolean;
  error?: "name" | "phone";
};

/*
 * Lead form stub. TODO: wire this to the real destination — options:
 * an email relay (Resend), a Telegram bot notification, or a Google
 * Sheet via Apps Script. Until then it validates and logs server-side
 * so submissions are at least visible in the deployment logs.
 */
export async function submitLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (name.length < 2) return { ok: false, error: "name" };
  if (!/^[+\d][\d\s\-()]{6,}$/.test(phone)) return { ok: false, error: "phone" };

  // TODO: replace with the real endpoint.
  console.log(`[lead] ${new Date().toISOString()} name=${name} phone=${phone}`);

  return { ok: true };
}
