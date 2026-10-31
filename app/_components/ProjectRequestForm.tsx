"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EMPTY_BRIEF, FIELD_LIMITS, fileError, MAX_FILES, type ProjectBrief, validateBrief } from "@/lib/project-request";
import { captureAttribution } from "@/lib/attribution";
import { ensureEnquirySession, fetchWithEnquirySession, resetEnquirySession } from "@/lib/request-client";
import { track } from "@/lib/analytics";

type Attachment = { id: string; file: File; preview?: string; progress: number; state: "waiting" | "uploading" | "uploaded" | "failed"; error?: string };
const REQUIRED = ["name", "phone", "furnitureType", "city"];
export default function ProjectRequestForm({ initialBrief, about = "" }: { initialBrief?: Partial<ProjectBrief>; about?: string }) {
  const t = useTranslations("request");
  const locale = useLocale();
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [brief, setBrief] = useState<ProjectBrief>({ ...EMPTY_BRIEF, description: about, ...initialBrief });
  const [files, setFiles] = useState<Attachment[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const busyRef = useRef(false);
  const started = useRef(false);
  const requestId = useRef("");
  const previews = useRef(new Set<string>());
  const requests = useRef(new Set<XMLHttpRequest>());
  // A modal can receive a new reviewed AI brief without discarding entered contact details.
  const [prevBrief, setPrevBrief] = useState(initialBrief);
  if (initialBrief !== prevBrief) { setPrevBrief(initialBrief); if (initialBrief) setBrief(previous => ({ ...previous, ...initialBrief })); }
  useEffect(() => () => {
    previews.current.forEach(url => URL.revokeObjectURL(url));
    requests.current.forEach(xhr => xhr.abort());
  }, []);
  function message(code: string) { return t.has(code) ? t(code) : t("unavailable"); }
  function begin() {
    if (!started.current) { started.current = true; captureAttribution(); track("FormStarted", { locale }); }
  }
  function updateFile(fileId: string, patch: Partial<Attachment>) {
    setFiles(previous => previous.map(file => file.id === fileId ? { ...file, ...patch } : file));
  }
  async function upload(item: Attachment): Promise<string> {
    updateFile(item.id, { state: "uploading", error: undefined, progress: 0 });
    try {
      await ensureEnquirySession();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest(); requests.current.add(xhr);
        xhr.open("POST", "/api/project-request/upload"); xhr.timeout = 55000;
        xhr.upload.onprogress = event => { if (event.lengthComputable) updateFile(item.id, { progress: Math.min(95, Math.round(event.loaded / event.total * 95)) }); };
        const fail = () => { requests.current.delete(xhr); reject(new Error("uploadFailed")); };
        xhr.onerror = fail; xhr.ontimeout = fail; xhr.onabort = fail;
        xhr.onload = () => {
          requests.current.delete(xhr);
          let response; try { response = JSON.parse(xhr.responseText); } catch { reject(new Error("uploadFailed")); return; }
          if (xhr.status >= 200 && xhr.status < 300 && response.uploadId === item.id) resolve();
          else { if (response.error === "session") resetEnquirySession(); reject(new Error(response.error || "uploadFailed")); }
        };
        const data = new FormData(); data.set("file", item.file); data.set("uploadId", item.id); xhr.send(data);
      });
      updateFile(item.id, { state: "uploaded", progress: 100 });
      track("UploadCompleted", { locale });
      return item.id;
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : "uploadFailed";
      updateFile(item.id, { state: "failed", error: code });
      throw new Error(code);
    }
  }
  function selectFiles(list: FileList | null) {
    if (!list) return;
    begin(); setError("");
    if (files.length + list.length > MAX_FILES) { setError("fileCount"); return; }
    const added: Attachment[] = [];
    for (const file of Array.from(list)) {
      const invalid = fileError(file);
      if (invalid) { setError(invalid); continue; }
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      if (preview) previews.current.add(preview);
      added.push({ id: crypto.randomUUID(), file, preview, progress: 0, state: "waiting" });
    }
    setFiles(previous => [...previous, ...added]);
  }
  async function remove(item: Attachment) {
    if (busyRef.current) return;
    setFiles(previous => previous.filter(file => file.id !== item.id));
    if (item.preview) { URL.revokeObjectURL(item.preview); previews.current.delete(item.preview); }
    // Failed requests may have reached ImageKit. The cleanup worker covers failed DELETEs too.
    if (item.state !== "waiting") await fetch("/api/project-request/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadId: item.id }) }).catch(() => {});
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busyRef.current || reference) return;
    begin(); setError("");
    const checked = validateBrief(brief); setErrors(checked.errors);
    if (checked.errors.length) { setError("validation"); form.current?.querySelector<HTMLElement>(`[name="${checked.errors[0]}"]`)?.focus(); return; }
    busyRef.current = true; setBusy(true);
    requestId.current ||= crypto.randomUUID();
    try {
      await ensureEnquirySession();
      const attachmentIds: string[] = [];
      for (const item of files) attachmentIds.push(item.state === "uploaded" ? item.id : await upload(item));
      const attribution = captureAttribution();
      const response = await fetchWithEnquirySession("/api/project-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId.current, brief: checked.brief, locale, attachmentIds, firstAttribution: attribution.first, latestAttribution: attribution.latest, website: new FormData(form.current!).get("website") }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok || typeof result.reference !== "string") {
        if (Array.isArray(result.fields)) setErrors(result.fields);
        if (result.error === "session") resetEnquirySession();
        throw new Error(result.error || "unavailable");
      }
      setReference(result.reference);
      // Server duplicate responses never count as another conversion.
      if (!result.duplicate) track("SubmissionSucceeded", { locale });
    } catch (failure) {
      setError(failure instanceof Error && t.has(failure.message) ? failure.message : "unavailable");
      track("SubmissionFailed", { locale });
    } finally { busyRef.current = false; setBusy(false); }
  }
  if (reference) return <section className="request-success" role="status" tabIndex={-1} ref={node => node?.focus()}>
    <h3>{t("success")}</h3><p>{t("reference")}: <strong>{reference}</strong></p>
    <button type="button" className="btn btn-line" onClick={() => { setReference(""); setBrief({ ...EMPTY_BRIEF }); setFiles([]); requestId.current = ""; started.current = false; }}>{t("another")}</button>
  </section>;
  return <form ref={form} className="project-request" id={`project-request-${id}`} onSubmit={submit} onFocus={begin} noValidate>
    <h2>{t("title")}</h2><p>{t("intro")}</p><p className="request-help">{t("required")}</p>
    {initialBrief && <p className="request-review">{t("review")}</p>}
    <fieldset disabled={busy} className="request-fields">
      {(Object.keys(EMPTY_BRIEF) as (keyof ProjectBrief)[]).map(field => <div key={field} className={`request-field ${field === "description" ? "request-wide" : ""}`}>
        <label htmlFor={`${id}-${field}`}>{t(field)} {REQUIRED.includes(field) ? "*" : <small>({t("optional")})</small>}</label>
        {field === "description" ? <textarea id={`${id}-${field}`} name={field} value={brief[field]} maxLength={FIELD_LIMITS[field]} rows={4} onChange={e => setBrief({ ...brief, [field]: e.target.value })} aria-invalid={errors.includes(field)} aria-describedby={errors.includes(field) ? `${id}-${field}-error` : undefined} /> :
          <input id={`${id}-${field}`} name={field} value={brief[field]} type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} autoComplete={field === "name" ? "name" : field === "phone" ? "tel" : field === "email" ? "email" : field === "city" ? "address-level2" : "off"} maxLength={FIELD_LIMITS[field]} required={REQUIRED.includes(field)} onChange={e => setBrief({ ...brief, [field]: e.target.value })} aria-invalid={errors.includes(field)} aria-describedby={errors.includes(field) ? `${id}-${field}-error` : undefined} />}
        {(field === "budget" || field === "dimensions") && <button type="button" className="request-unsure" onClick={() => setBrief({ ...brief, [field]: t("notSure") })}>{t("notSure")}</button>}
        {errors.includes(field) && <span id={`${id}-${field}-error`} className="request-error">{t.has(`${field}Error`) ? t(`${field}Error`) : t("fieldError")}</span>}
      </div>)}
      <div className="request-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="request-wide request-field">
        <label htmlFor={`${id}-files`}>{t("files")} <small>({t("optional")})</small></label>
        <p id={`${id}-file-hint`} className="request-help">{t("fileHint")}</p>
        <input id={`${id}-files`} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" aria-describedby={`${id}-file-hint`} onChange={e => { selectFiles(e.target.files); e.target.value = ""; }} />
      </div>
    </fieldset>
    <ul className="request-files">{files.map(item => <li key={item.id}>
      {/* Local object URLs only; no private delivery URLs enter the browser. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.preview ? <img src={item.preview} alt="" width={56} height={56} /> : <span aria-hidden="true">PDF</span>}
      <div><span className="request-file-name">{item.file.name}</span><small>{(item.file.size / 1024 / 1024).toFixed(1)} MB · {item.state === "failed" ? message(item.error || "uploadFailed") : t(item.state)}</small>
        {item.state === "uploading" && <progress max={100} value={item.progress} aria-label={t("uploading")} />}
      </div>
      <button type="button" disabled={busy} aria-label={`${t("remove")}: ${item.file.name}`} onClick={() => void remove(item)}>{t("remove")}</button>
    </li>)}</ul>
    <p className="request-help">{t("sharing")}</p>
    {error && <p className="request-error" role="alert">{message(error)}</p>}
    <button type="submit" className="btn request-submit" disabled={busy}>{busy ? t("sending") : t("submit")}</button>
  </form>;
}
