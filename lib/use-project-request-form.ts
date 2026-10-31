"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EMPTY_BRIEF, fileError, MAX_FILES, type ProjectBrief, validateBrief } from "@/lib/project-request";
import { captureAttribution } from "@/lib/attribution";
import { ensureEnquirySession, fetchWithEnquirySession, resetEnquirySession } from "@/lib/request-client";
import { uploadProjectReference } from "@/lib/project-request-upload";
import { track } from "@/lib/analytics";

type Attachment = { id: string; file: File; preview?: string; progress: number; state: "waiting" | "uploading" | "uploaded" | "failed"; error?: string };
export type ProjectRequestFormOptions = { initialBrief?: Partial<ProjectBrief>; about?: string; onDraftChange?: (brief: ProjectBrief) => void };

/** One request lifecycle for the Contact page and the AI review. */
export function useProjectRequestForm({ initialBrief, about = "", onDraftChange }: ProjectRequestFormOptions) {
  const t = useTranslations("request");
  const locale = useLocale();
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
  const submission = useRef<AbortController | null>(null);
  // New conversation facts can refresh the review without discarding other fields.
  const [context, setContext] = useState({ initialBrief, about });
  if (initialBrief !== context.initialBrief || about !== context.about) {
    setContext({ initialBrief, about });
    setBrief(previous => ({
      ...previous,
      ...(previous.description === (context.initialBrief?.description ?? context.about) ? { description: about } : {}),
      ...initialBrief,
    }));
  }
  useEffect(() => () => {
    previews.current.forEach(url => URL.revokeObjectURL(url));
    submission.current?.abort();
  }, []);
  useEffect(() => { onDraftChange?.(brief); }, [brief, onDraftChange]);
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
      await uploadProjectReference(item, progress => updateFile(item.id, { progress }), submission.current!.signal);
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
    if (item.state !== "waiting") await fetchWithEnquirySession("/api/project-request/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadId: item.id }), signal: AbortSignal.timeout(15000) }).catch(() => {});
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busyRef.current || reference) return;
    begin(); setError("");
    const checked = validateBrief(brief); setErrors(checked.errors);
    if (checked.errors.length) { setError("validation"); form.current?.querySelector<HTMLElement>(`[name="${checked.errors[0]}"]`)?.focus(); return; }
    busyRef.current = true; setBusy(true);
    const controller = new AbortController(); submission.current = controller;
    requestId.current ||= crypto.randomUUID();
    try {
      await ensureEnquirySession(controller.signal);
      const attachmentIds: string[] = [];
      for (const item of files) attachmentIds.push(item.state === "uploaded" ? item.id : await upload(item));
      const attribution = captureAttribution();
      const response = await fetchWithEnquirySession("/api/project-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId.current, brief: checked.brief, locale, attachmentIds, firstAttribution: attribution.first, latestAttribution: attribution.latest, website: new FormData(form.current!).get("website") }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
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
    } finally { submission.current = null; busyRef.current = false; setBusy(false); }
  }
  function reset() {
    previews.current.forEach(url => URL.revokeObjectURL(url));
    previews.current.clear();
    setReference(""); setBrief({ ...EMPTY_BRIEF }); setFiles([]);
    setErrors([]); setError(""); requestId.current = ""; started.current = false;
  }
  return { form, brief, setBrief, files, errors, error, busy, reference, message, begin, selectFiles, remove, submit, reset };
}
