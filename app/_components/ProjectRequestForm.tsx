"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { FIELD_LIMITS, MAX_FILES, type ProjectBrief } from "@/lib/project-request";
import { useProjectRequestForm, type ProjectRequestFormOptions } from "@/lib/use-project-request-form";

const REQUIRED = ["name", "phone", "furnitureType", "city"];
export default function ProjectRequestForm(options: ProjectRequestFormOptions) {
  const t = useTranslations("request");
  const id = useId();
  const { form, brief, setBrief, files, errors, error, busy, reference, message, begin, selectFiles, remove, submit, reset } = useProjectRequestForm(options);
  if (reference) return <section className="request-success" role="status" tabIndex={-1} ref={node => node?.focus()}>
    <span className="request-success-mark" aria-hidden="true">✓</span><h3>{t("success")}</h3><p>{t("reference")}: <strong>{reference}</strong></p><p>{t("successNote")}</p>
    <button type="button" className="btn btn-line" onClick={reset}>{t("another")}</button>
  </section>;
  function field(key: keyof ProjectBrief) {
    const invalid = errors.includes(key);
    return <div key={key} className={`request-field ${key === "description" ? "request-wide" : ""}`}>
      <label htmlFor={`${id}-${key}`}><span>{t(key)} {REQUIRED.includes(key) && "*"}</span>{!REQUIRED.includes(key) && <small>{t("optional")}</small>}</label>
      {key === "description" ? <textarea id={`${id}-${key}`} name={key} value={brief[key]} maxLength={FIELD_LIMITS[key]} rows={4} onChange={e => setBrief({ ...brief, [key]: e.target.value })} aria-invalid={invalid} aria-describedby={invalid ? `${id}-${key}-error` : undefined} /> :
        <input id={`${id}-${key}`} name={key} value={brief[key]} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} autoComplete={key === "name" ? "name" : key === "phone" ? "tel" : key === "email" ? "email" : key === "city" ? "address-level2" : "off"} maxLength={FIELD_LIMITS[key]} required={REQUIRED.includes(key)} onChange={e => setBrief({ ...brief, [key]: e.target.value })} aria-invalid={invalid} aria-describedby={invalid ? `${id}-${key}-error` : key === "email" ? `${id}-email-hint` : undefined} />}
      {key === "email" && <small id={`${id}-email-hint`} className="request-help">{t("emailHint")}</small>}
      {(key === "budget" || key === "dimensions") && <button type="button" className="request-unsure" onClick={() => setBrief({ ...brief, [key]: t("notSure") })}>{t("notSure")}</button>}
      {invalid && <span id={`${id}-${key}-error`} className="request-error">{t.has(`${key}Error`) ? t(`${key}Error`) : t("fieldError")}</span>}
    </div>;
  }
  return <form ref={form} className="project-request" id={`project-request-${id}`} onSubmit={submit} onFocus={begin} noValidate>
    <div className="request-form-heading"><h2>{t("title")}</h2><p>{t("intro")}</p><p className="request-help">{t("required")}</p></div>
    {options.initialBrief && <p className="request-review">{t("review")}</p>}
    <fieldset disabled={busy} className="request-fields"><legend><span>01</span>{t("contactDetails")}</legend>{(["name", "phone", "email"] as const).map(field)}</fieldset>
    <fieldset disabled={busy} className="request-fields"><legend><span>02</span>{t("projectDetails")}</legend>{(["furnitureType", "city", "description", "dimensions", "budget", "timing"] as const).map(field)}</fieldset>
    <div className="request-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <fieldset disabled={busy} className="request-fields request-attachment-fields"><legend><span>03</span>{t("files")} <small>{t("optional")}</small></legend>
      <div className="request-wide request-upload-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) selectFiles(event.dataTransfer.files); }}>
        <label htmlFor={`${id}-files`}><span className="request-upload-icon" aria-hidden="true">＋</span><span>{t("chooseFiles")}</span><small id={`${id}-file-hint`}>{t("fileHint")}</small><span className="request-upload-count">{files.length} / {MAX_FILES}</span></label>
        <input id={`${id}-files`} className="request-file-input" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" aria-describedby={`${id}-file-hint`} onChange={e => { selectFiles(e.target.files); e.target.value = ""; }} />
      </div>
    </fieldset>
    <ul className="request-files">{files.map(item => <li key={item.id}>
      {/* Local object URLs only; private delivery URLs stay on the server. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.preview ? <img src={item.preview} alt="" width={56} height={56} /> : <span aria-hidden="true">PDF</span>}
      <div><span className="request-file-name">{item.file.name}</span><small>{(item.file.size / 1024 / 1024).toFixed(1)} MB · {item.state === "failed" ? message(item.error || "uploadFailed") : t(item.state)}</small>
        {item.state === "uploading" && <progress max={100} value={item.progress} aria-label={t("uploading")} />}
      </div><button type="button" disabled={busy} aria-label={`${t("remove")}: ${item.file.name}`} onClick={() => void remove(item)}>{t("remove")}</button>
    </li>)}</ul>
    <p className="request-help request-privacy">{t("sharing")}</p>
    {error && <p className="request-error" role="alert">{message(error)}</p>}
    <button type="submit" className="btn request-submit" disabled={busy}>{busy ? t("sending") : t("submit")} <span aria-hidden="true">↗</span></button>
  </form>;
}
