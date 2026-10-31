export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const FILE_TYPES = {
  "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"],
  "image/webp": ["webp"], "application/pdf": ["pdf"],
} as const;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type Attribution = {
  utm_source: string | null; utm_medium: string | null;
  utm_campaign: string | null; utm_content: string | null;
  landing: string | null; referrer: string | null;
};
export type ProjectBrief = {
  name: string; phone: string; furnitureType: string; city: string;
  email: string; description: string; dimensions: string; budget: string; timing: string;
};
export const EMPTY_BRIEF: ProjectBrief = {
  name: "", phone: "", furnitureType: "", city: "", email: "",
  description: "", dimensions: "", budget: "", timing: "",
};
export const FIELD_LIMITS: Record<keyof ProjectBrief, number> = {
  name: 100, phone: 32, furnitureType: 120, city: 160, email: 254,
  description: 3000, dimensions: 200, budget: 200, timing: 200,
};
export function validateBrief(input: unknown): { brief: ProjectBrief; errors: string[] } {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const brief = { ...EMPTY_BRIEF };
  const errors: string[] = [];
  for (const field of Object.keys(brief) as (keyof ProjectBrief)[]) {
    const value = source[field];
    if (typeof value !== "string" || value.length > FIELD_LIMITS[field]) errors.push(field);
    else brief[field] = value.trim();
  }
  if (brief.name.length < 2) errors.push("name");
  if (!/^[+\d][\d\s()\-]{5,31}$/.test(brief.phone) || brief.phone.replace(/\D/g, "").length < 7) errors.push("phone");
  if (!brief.furnitureType) errors.push("furnitureType");
  if (!brief.city) errors.push("city");
  if (brief.email && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(brief.email)) errors.push("email");
  return { brief, errors: [...new Set(errors)] };
}
export function fileError(file: { name: string; type: string; size: number }): "fileType" | "fileSize" | null {
  const extensions = FILE_TYPES[file.type as keyof typeof FILE_TYPES] as readonly string[] | undefined;
  if (!extensions?.includes(file.name.split(".").pop()?.toLowerCase() || "")) return "fileType";
  return file.size < 1 || file.size > MAX_FILE_BYTES ? "fileSize" : null;
}
export function matchesSignature(type: string, bytes: Uint8Array): boolean {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/png") return [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b);
  if (type === "image/webp") return ascii(0,4) === "RIFF" && ascii(8,12) === "WEBP";
  return type === "application/pdf" && ascii(0,5) === "%PDF-";
}
export function cleanAttribution(value: unknown): Attribution {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result: Attribution = { utm_source:null,utm_medium:null,utm_campaign:null,utm_content:null,landing:null,referrer:null };
  for (const key of Object.keys(result) as (keyof Attribution)[]) {
    if (typeof raw[key] !== "string") continue;
    const text = raw[key].trim();
    if (!text) continue;
    if (key === "landing") result[key] = /^\/(?!\/)/.test(text) ? text.split(/[?#]/)[0].slice(0,300) : null;
    else if (key === "referrer") {
      try { const url = new URL(text); if (/^https?:$/.test(url.protocol)) result[key] = url.origin; } catch { /* unknown */ }
    } else result[key] = text.slice(0,100);
  }
  return result;
}
