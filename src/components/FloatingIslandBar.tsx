"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ArrowUpRight, CalendarCheck, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Copy, ImageIcon, Images, MessageCircle, Phone, Plus, RotateCcw, Square, SquarePen, X, Ruler } from "lucide-react";
import { containDialogTab, lockPage } from "@/lib/modal-lock";
import ContactLink from "@/app/_components/ContactLink";
import { Link } from "@/i18n/navigation";
import type { AssistantUi } from "@/lib/assistant-media";
import type { Locale } from "@/i18n/routing";

interface ChatMessage { role: "user" | "assistant"; content: string; ui?: AssistantUi }
interface LeadState {
  furnitureKey: "furnitureKitchen" | "furnitureWardrobe" | "furnitureCommercial" | "furniturePanels";
  city: string;
  designKey: "designPinterest" | "designDrawings" | "designNeed3d" | "designNeedInterior";
  phone: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const isUi = (value: unknown): value is AssistantUi =>
  !!value && typeof value === "object" && Array.isArray((value as AssistantUi).media);

// Render the API's small inline Markdown vocabulary using safe React text nodes.
function MessageText({ content }: { content: string }) {
  return <>{content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> :
    part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part,
  )}</>;
}

export default function FloatingIslandBar() {
  const t = useTranslations("home.aiIsland");
  const ui = useTranslations("assistant");
  const locale = useLocale() as Locale;
  const drawerId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [showEstimator, setShowEstimator] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lead, setLead] = useState<LeadState>({ furnitureKey: "furnitureKitchen", city: "", designKey: "designPinterest", phone: "" });
  const [customWhatsappPrefill, setCustomWhatsappPrefill] = useState("");
  const [lightbox, setLightbox] = useState<{ message: number; index: number } | null>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const [slideDirection, setSlideDirection] = useState(1);

  const openChat = useCallback(() => {
    if (!dialogRef.current?.open) openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    releaseRef.current ??= lockPage();
    // Touch devices start with the welcome visible instead of opening the keyboard.
    (matchMedia("(pointer: coarse)").matches ? closeRef.current : inputRef.current)?.focus({ preventScroll: true });
    const viewport = window.visualViewport;
    const fitViewport = () => {
      if (!viewport) return;
      dialog.style.setProperty("--chat-viewport-height", `${viewport.height}px`);
      dialog.style.setProperty("--chat-viewport-top", `${viewport.offsetTop}px`);
    };
    fitViewport();
    viewport?.addEventListener("resize", fitViewport);
    viewport?.addEventListener("scroll", fitViewport);
    return () => {
      viewport?.removeEventListener("resize", fitViewport);
      viewport?.removeEventListener("scroll", fitViewport);
    };
  }, [open]);

  useEffect(() => () => { requestRef.current?.abort(); releaseRef.current?.(); }, []);
  useEffect(() => {
    if (!showEstimator || !open) return;
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>("[data-ai-details] button")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [showEstimator, open]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, loading]);
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 144)}px`;
  }, [input, open]);

  const sendQuestion = useCallback(async (question: string, retry = false) => {
    const trimmed = question.trim();
    if (!trimmed || busyRef.current) return;
    busyRef.current = true;
    const history = retry ? messages.slice(0, messages.findLastIndex(message => message.role === "user") + 1) : messages;
    const nextMessages: ChatMessage[] = retry ? history : [...history.filter(message => message.content.trim()), { role: "user", content: trimmed }];
    const responseIndex = nextMessages.length;
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setFailedQuestion(null);
    setCopied(null);
    setStopped(false);
    setLoading(true);
    const controller = new AbortController();
    requestRef.current = controller;
    let reply = "";
    const updateReply = (text: string) => {
      reply += text;
      setMessages(previous => previous.map((message, index) => index === responseIndex ? { ...message, content: reply } : message));
    };
    const attachUi = (value: unknown) => {
      if (!isUi(value)) return;
      setMessages(previous => previous.map((message, index) => index === responseIndex ? { ...message, ui: value } : message));
    };
    // Photos already shown are sent back so "show me more" brings new ones.
    const shown = history.flatMap(message => message.ui?.media.map(item => item.src) ?? []);
    try {
      const response = await fetch("/api/ai-consultant", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, stream: true, shown, messages: nextMessages.map(({ role, content }) => ({ role, content })), lead: { furnitureType: t(lead.furnitureKey), city: lead.city, designStatus: t(lead.designKey), phone: lead.phone } }),
      });
      if (!response.ok) throw new Error("Request failed");
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        if (!response.body) throw new Error("Missing stream");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let complete = false;
        const consume = (event: string) => {
          const data = event.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
          if (!data) return;
          const item = JSON.parse(data);
          if (item.error) throw new Error("Response interrupted");
          if (item.done === true) complete = true;
          if (typeof item.delta === "string") updateReply(item.delta);
          if (typeof item.whatsappPrefill === "string") setCustomWhatsappPrefill(item.whatsappPrefill);
          if (item.ui) attachUi(item.ui);
        };
        try {
          while (true) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
            let separator;
            while ((separator = buffer.indexOf("\n\n")) !== -1) {
              consume(buffer.slice(0, separator));
              buffer = buffer.slice(separator + 2);
            }
            if (done) { if (buffer.trim()) consume(buffer); break; }
          }
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
        if (!complete) throw new Error("Response interrupted");
      } else {
        const data = await response.json();
        if (typeof data.reply !== "string") throw new Error("Empty response");
        updateReply(data.reply);
        if (typeof data.whatsappPrefill === "string") setCustomWhatsappPrefill(data.whatsappPrefill);
        if (data.ui) attachUi(data.ui);
      }
      if (!reply.trim()) throw new Error("Empty response");
    } catch {
      if (!controller.signal.aborted) setFailedQuestion(trimmed);
      else setStopped(true);
      if (!reply.trim()) setMessages(previous => previous.filter((_, index) => index !== responseIndex));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [lead, locale, messages, t]);

  const newChat = () => {
    requestRef.current?.abort();
    setMessages([]);
    setCopied(null);
    setInput("");
    setFailedQuestion(null);
    setStopped(false);
    setCustomWhatsappPrefill("");
    setShowEstimator(false);
    setLightbox(null);
    if (matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  };
  const copyMessage = async (index: number) => {
    try { await navigator.clipboard.writeText(messages[index].content); setCopied(index); }
    catch { setCopied(null); }
  };

  useEffect(() => {
    const onOpenAi = (event: Event) => {
      openChat();
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (prompt) void sendQuestion(prompt);
    };
    window.addEventListener("kencho:open-ai", onOpenAi);
    return () => window.removeEventListener("kencho:open-ai", onOpenAi);
  }, [openChat, sendQuestion]);

  const buildLiveWhatsappSummary = () => {
    if (customWhatsappPrefill && !lead.city && !lead.phone) {
      return customWhatsappPrefill;
    }
    const furnitureType = t(lead.furnitureKey);
    const designStatus = t(lead.designKey);
    const lastUser =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (locale === "ru") {
      return [
        "Здравствуйте, Kencho Group! Заявка через AI-консультанта:",
        `• Тип мебели: ${furnitureType}`,
        lead.city ? `• Город / локация: ${lead.city}` : null,
        `• Статус проекта: ${designStatus}`,
        lead.phone ? `• Телефон: ${lead.phone}` : null,
        lastUser ? `• Вопрос: ${lastUser}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (locale === "en") {
      return [
        "Hello Kencho Group! Project inquiry via AI Consultant:",
        `• Furniture Type: ${furnitureType}`,
        lead.city ? `• City / Location: ${lead.city}` : null,
        `• Design Status: ${designStatus}`,
        lead.phone ? `• Phone: ${lead.phone}` : null,
        lastUser ? `• Question: ${lastUser}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }
    return [
      "გამარჯობა, Kencho Group! მოთხოვნა AI კონსულტანტიდან:",
      `• ავეჯის ტიპი: ${furnitureType}`,
      lead.city ? `• ქალაქი / მდებარეობა: ${lead.city}` : null,
      `• დიზაინის სტატუსი: ${designStatus}`,
      lead.phone ? `• ტელეფონი: ${lead.phone}` : null,
      lastUser ? `• კითხვა: ${lastUser}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const suggestions = [
    { key: "chip1", label: "promptCost", icon: Ruler },
    { key: "chip2", label: "promptTime", icon: Clock3 },
    { key: "chip3", label: "promptPhoto", icon: ImageIcon },
  ] as const;
  const toggleDetails = () => { setShowEstimator(value => !value); };
  const lightboxMedia = lightbox ? messages[lightbox.message]?.ui?.media ?? [] : [];
  const activePhoto = lightbox ? lightboxMedia[lightbox.index] : undefined;
  const openLightbox = (message: number, index: number) => { setSlideDirection(1); setLightbox({ message, index }); };
  const closeLightbox = () => {
    const current = lightbox;
    setLightbox(null);
    if (!current) return;
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>(`[data-ai-media="${current.message}-${current.index}"]`)?.focus({ preventScroll: true }));
  };
  const stepLightbox = (step: number) => {
    if (!lightbox || lightboxMedia.length < 2) return;
    setSlideDirection(step);
    setLightbox({ ...lightbox, index: (lightbox.index + step + lightboxMedia.length) % lightboxMedia.length });
  };
  useEffect(() => {
    if (!lightbox) return;
    const frame = requestAnimationFrame(() => lightboxCloseRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [lightbox]);
  const bookingMessage = () => [ui("bookPrefill"), ...buildLiveWhatsappSummary().split("\n").slice(1)].join("\n");
  const galleryHref = (category: AssistantUi["category"] | undefined) => (category ? `/gallery/${category}` : "/gallery") as "/gallery";
  const photoPrompt = locale === "ka"
    ? "მაჩვენეთ თქვენი შესრულებული სამზარეულოების და პროექტების ფოტოები"
    : locale === "ru"
      ? "Покажите фотографии ваших кухонь и проектов"
      : "Show me photos of your completed kitchens and projects";
  const finishClose = () => {
    dialogRef.current?.close();
    releaseRef.current?.();
    releaseRef.current = null;
    const opener = openerRef.current;
    (opener?.isConnected ? opener : triggerRef.current)?.focus({ preventScroll: true });
  };

  return <>
    <div data-floating-island className="ai-dock">
      <motion.button ref={triggerRef} type="button" data-ai-trigger aria-haspopup="dialog" aria-expanded={open} aria-controls={drawerId}
        onClick={openChat} className="ai-launcher" style={{ visibility: open ? "hidden" : "visible" }} whileTap={reducedMotion ? undefined : { scale: 0.97 }}>
        <MessageCircle size={18} strokeWidth={1.6} aria-hidden="true"/>
        <span className="ai-launcher-label">{t("pillLabel")}</span>
        <span className="ai-launcher-send" aria-hidden="true"><ArrowUp size={15} strokeWidth={2.2}/></span>
      </motion.button>
    </div>
    <dialog ref={dialogRef} id={drawerId} className="chat-modal" aria-label={t("drawerTitle")}
      onCancel={event=>{event.preventDefault();if(lightbox) closeLightbox(); else setOpen(false);}} onKeyDown={containDialogTab}
      onClick={event=>{
        if(event.target !== event.currentTarget) return;
        const rect=event.currentTarget.getBoundingClientRect();
        if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) setOpen(false);
      }}>
      <AnimatePresence onExitComplete={finishClose}>
        {open && <motion.div className="chat-workspace" style={{transformOrigin:"bottom center"}}
          initial={reducedMotion?{opacity:0}:{opacity:0,y:28,scale:0.96}}
          animate={{opacity:1,y:0,scale:1}}
          exit={reducedMotion?{opacity:0}:{opacity:0,y:18,scale:0.97}}
          transition={{duration:reducedMotion?0:0.22,ease:EASE}}>
          <section className={`chat-context ${messages.length===0?"is-empty":""} ${showEstimator?"has-details":""}`} data-ai-drawer data-lenis-prevent>
            <header className="chat-header">
              <div className="chat-identity"><h2>Kencho AI</h2><ChevronDown size={15} aria-hidden="true"/></div>
              <div className="chat-toolbar">
                <button type="button" data-ai-new-chat className="chat-icon-button" aria-label={ui("newChat")} title={ui("newChat")} onClick={newChat} disabled={loading}><SquarePen size={19}/></button>
                <ContactLink method="whatsapp" about="AI Consultant Project Estimate" message={buildLiveWhatsappSummary()} className="chat-team-link" aria-label={t("whatsappHandoff")} title={t("whatsappHandoff")}><MessageCircle size={18}/></ContactLink>
                <button ref={closeRef} type="button" className="chat-icon-button" aria-label={t("close")} title={t("close")} onClick={()=>setOpen(false)}><X size={21}/></button>
              </div>
            </header>
            <div className="chat-stage">
              <div className="chat-thread-frame">
                <div className="chat-body" inert={showEstimator || !!lightbox}>
                  <div ref={scrollRef} className="chat-conversation" tabIndex={0} role="region" aria-label={ui("assistant")}>
                    {messages.length===0 ? <motion.div key="welcome" className="chat-welcome-stage"
                      initial={reducedMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:reducedMotion?0:0.2,ease:EASE}}>
                      <div className="chat-welcome">
                        <h3>{ui("welcomeTitle")}</h3>
                        <p className="chat-welcome-sub">{ui("welcomeText")}</p>
                      </div>
                      <div className="chat-suggestions" aria-label={t("chipsLabel")}>
                        {suggestions.map(({key,label,icon:Icon})=><button key={key} type="button" data-ai-chip className="chat-suggestion" onClick={()=>void sendQuestion(t(key))}><Icon size={16} strokeWidth={1.5}/><span>{ui(label)}</span></button>)}
                      </div>
                      <div className="chat-reply-ctas is-welcome" role="group" aria-label={ui("actionsLabel")}>
                        <button type="button" data-ai-show-photos className="chat-cta-pill" onClick={()=>void sendQuestion(photoPrompt)}>
                          <ImageIcon size={15} aria-hidden="true"/>
                          <span>{ui("photosLabel")}</span>
                        </button>
                        <ContactLink method="whatsapp" about="AI Consultant Appointment Booking" message={bookingMessage()} data-ai-book className="chat-cta-pill is-primary">
                          <CalendarCheck size={15} aria-hidden="true"/>
                          <span>{ui("bookVisit")}</span>
                          <ArrowUpRight size={14} aria-hidden="true"/>
                        </ContactLink>
                        <ContactLink method="phone" about="AI Consultant Direct Call" data-ai-call className="chat-cta-pill">
                          <Phone size={15} aria-hidden="true"/>
                          <span>{ui("callNow")}</span>
                        </ContactLink>
                        <Link href="/gallery" data-ai-gallery onClick={()=>setOpen(false)} className="chat-cta-pill">
                          <Images size={15} aria-hidden="true"/>
                          <span>{ui("openGallery")}</span>
                          <ArrowUpRight size={14} aria-hidden="true"/>
                        </Link>
                      </div>
                    </motion.div> : <motion.div key="messages" className="chat-message-list" role="log" aria-live="polite" aria-relevant="additions text" aria-label={ui("assistant")}
                      initial={reducedMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:reducedMotion?0:0.18,ease:EASE}}>
                      {messages.map((message,index)=><motion.article key={index} initial={reducedMotion?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reducedMotion?0:0.18,ease:EASE}} className={`chat-message is-${message.role}`} aria-label={ui(message.role==="user"?"you":"assistant")}>
                        <div className="chat-message-text whitespace-pre-line"><MessageText content={message.content}/></div>
                        {message.role==="assistant" && message.ui && message.ui.media.length>0 && <motion.div className="chat-media-grid" data-ai-media-grid aria-label={ui("photosLabel")}
                          initial={reducedMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:reducedMotion?0:0.22,ease:EASE}}>
                          {message.ui.media.map((photo,photoIndex)=><button key={photo.src} type="button" data-ai-media={`${index}-${photoIndex}`} className="chat-media-card" aria-label={`${ui("enlargePhoto")}: ${photo.caption}`} onClick={()=>openLightbox(index,photoIndex)}>
                            <span className="chat-media-frame">
                              <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 767px) 44vw, 340px" className="chat-media-img"/>
                            </span>
                            <span className="chat-media-caption">
                              <span>{photo.caption}</span>
                              <ArrowUpRight size={14} aria-hidden="true"/>
                            </span>
                          </button>)}
                        </motion.div>}
                        {message.role==="assistant" && message.content && !loading && <>
                          {index===messages.length-1 && <div className="chat-reply-ctas" role="group" aria-label={ui("actionsLabel")}>
                            <ContactLink method="whatsapp" about="AI Consultant Appointment Booking" message={bookingMessage()} data-ai-book className="chat-cta-pill is-primary">
                              <CalendarCheck size={15} aria-hidden="true"/>
                              <span>{ui("bookVisit")}</span>
                              <ArrowUpRight size={14} aria-hidden="true"/>
                            </ContactLink>
                            <ContactLink method="phone" about="AI Consultant Direct Call" data-ai-call className="chat-cta-pill">
                              <Phone size={15} aria-hidden="true"/>
                              <span>{ui("callNow")}</span>
                            </ContactLink>
                            <Link href={galleryHref(message.ui?.category)} data-ai-gallery onClick={()=>setOpen(false)} className="chat-cta-pill">
                              <Images size={15} aria-hidden="true"/>
                              <span>{ui("openGallery")}</span>
                              <ArrowUpRight size={14} aria-hidden="true"/>
                            </Link>
                            {(!message.ui || message.ui.media.length===0) && <button type="button" data-ai-show-photos className="chat-cta-pill" onClick={()=>void sendQuestion(photoPrompt)}>
                              <ImageIcon size={15} aria-hidden="true"/>
                              <span>{ui("photosLabel")}</span>
                            </button>}
                          </div>}
                          <div className="chat-message-actions">
                            <button type="button" data-ai-copy className="chat-action" aria-label={copied===index?ui("copied"):ui("copy")} title={copied===index?ui("copied"):ui("copy")} onClick={()=>void copyMessage(index)}>{copied===index?<Check size={16}/>:<Copy size={16}/>}</button>
                            {index===messages.length-1 && <button type="button" className="chat-action" aria-label={ui("regenerate")} title={ui("regenerate")} onClick={()=>void sendQuestion([...messages].reverse().find(m=>m.role==="user")?.content??"",true)}><RotateCcw size={16}/></button>}
                          </div>
                        </>}
                      </motion.article>)}
                      {loading && !messages.at(-1)?.content && <div className="chat-thinking" role="status"><span className="chat-thinking-dot" aria-hidden="true"/><span className="sr-only">{t("thinking")}</span></div>}
                      {stopped && <p className="chat-stopped" role="status">{ui("stopped")}</p>}
                      {failedQuestion && <div className="chat-error" role="alert"><p>{ui("error")}</p><button type="button" onClick={()=>void sendQuestion(failedQuestion,true)}>{ui("retry")}</button></div>}
                    </motion.div>}
                  </div>
                </div>
                <div className="chat-bottom-dock" inert={!!lightbox}>
                  <motion.form layout="position" transition={{duration:reducedMotion?0:0.2,ease:EASE}} className="chat-composer" onSubmit={event=>{event.preventDefault();void sendQuestion(input);}}>
                    <textarea ref={inputRef} rows={1} aria-label={ui("messageLabel")} value={input} maxLength={4000} placeholder={ui("shortPlaceholder")} onChange={event=>setInput(event.target.value)}
                      onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing&&matchMedia("(pointer:fine)").matches){event.preventDefault();void sendQuestion(input);}}}/>
                    <div className="chat-composer-tools">
                      <button type="button" className="chat-icon-button" data-ai-details-toggle aria-label={ui("details")} title={ui("details")} aria-expanded={showEstimator} aria-controls={`${drawerId}-details`} onClick={toggleDetails}>
                        <Plus size={22} style={{transform:showEstimator?"rotate(45deg)":"none",transition:reducedMotion?"none":"transform .2s cubic-bezier(.22,1,.36,1)"}}/>
                      </button>
                      {loading ? <button type="button" className="chat-send" data-ai-stop aria-label={ui("stop")} title={ui("stop")} onClick={()=>requestRef.current?.abort()}><Square size={15} fill="currentColor"/></button> : <button type="submit" className="chat-send" disabled={!input.trim()} aria-label={t("send")} title={t("send")}><ArrowUp size={21} strokeWidth={2}/></button>}
                    </div>
                  </motion.form>
                  <p className="chat-disclaimer">{ui("disclaimer")}</p>
                </div>
              </div>
              <AnimatePresence>
                {activePhoto && lightbox && <motion.div key="lightbox" data-ai-lightbox className="chat-lightbox" role="region" aria-label={activePhoto.caption}
                  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reducedMotion?0:0.18,ease:EASE}}>
                  <div className="chat-lightbox-top">
                    <span className="chat-lightbox-caption">{activePhoto.caption} ({lightbox.index+1}/{lightboxMedia.length})</span>
                    <button ref={lightboxCloseRef} type="button" data-ai-lightbox-close className="chat-icon-button" aria-label={ui("closePhoto")} onClick={closeLightbox}><X size={20}/></button>
                  </div>
                  <div className="chat-lightbox-stage">
                    {lightboxMedia.length>1 && <button type="button" className="chat-lightbox-nav is-prev" aria-label={ui("prevPhoto")} onClick={()=>stepLightbox(-1)}><ChevronLeft size={22}/></button>}
                    <motion.div key={activePhoto.src} className="chat-lightbox-figure"
                      initial={reducedMotion?false:{opacity:0,x:slideDirection*18,scale:0.98}}
                      animate={{opacity:1,x:0,scale:1}}
                      transition={{duration:reducedMotion?0:0.22,ease:EASE}}>
                      <Image src={activePhoto.src} alt={activePhoto.alt} fill sizes="(max-width: 767px) 92vw, 960px" className="object-contain"/>
                    </motion.div>
                    {lightboxMedia.length>1 && <button type="button" className="chat-lightbox-nav is-next" aria-label={ui("nextPhoto")} onClick={()=>stepLightbox(1)}><ChevronRight size={22}/></button>}
                  </div>
                  <div className="chat-lightbox-actions">
                    <ContactLink method="whatsapp" about={activePhoto.caption} message={bookingMessage()} className="chat-cta-pill is-primary">
                      <CalendarCheck size={15} aria-hidden="true"/>
                      <span>{ui("bookVisit")}</span>
                      <ArrowUpRight size={14} aria-hidden="true"/>
                    </ContactLink>
                    <ContactLink method="phone" about="AI Consultant Direct Call" className="chat-cta-pill">
                      <Phone size={15} aria-hidden="true"/>
                      <span>{ui("callNow")}</span>
                    </ContactLink>
                    <Link href={galleryHref(messages[lightbox.message]?.ui?.category)} onClick={()=>setOpen(false)} className="chat-cta-pill">
                      <Images size={15} aria-hidden="true"/>
                      <span>{ui("openGallery")}</span>
                      <ArrowUpRight size={14} aria-hidden="true"/>
                    </Link>
                  </div>
                </motion.div>}
              </AnimatePresence>
              <AnimatePresence>
                {showEstimator && <motion.aside id={`${drawerId}-details`} data-ai-details className="chat-details" aria-label={ui("details")} initial={{opacity:0,x:reducedMotion?0:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:reducedMotion?0:20}} transition={{duration:reducedMotion?0:.2,ease:EASE}}>
                  <div className="chat-details-heading"><h3>{ui("details")}</h3><button className="chat-icon-button" type="button" aria-label={ui("detailsDone")} onClick={()=>{setShowEstimator(false);inputRef.current?.focus();}}><X size={18}/></button></div><p>{ui("detailsNote")}</p>
                  <div className="chat-detail-fields">
                    <label htmlFor={`${drawerId}-furniture`}>{t("fieldFurniture")}<select id={`${drawerId}-furniture`} value={lead.furnitureKey} onChange={e=>setLead({...lead,furnitureKey:e.target.value as LeadState["furnitureKey"]})}>{(["furnitureKitchen","furnitureWardrobe","furnitureCommercial","furniturePanels"] as const).map(key=><option key={key} value={key}>{t(key)}</option>)}</select></label>
                    <label htmlFor={`${drawerId}-city`}>{t("fieldCity")}<input id={`${drawerId}-city`} autoComplete="address-level2" value={lead.city} placeholder={t("cityPlaceholder")} onChange={e=>setLead({...lead,city:e.target.value})}/></label>
                    <label htmlFor={`${drawerId}-design`}>{t("fieldDesign")}<select id={`${drawerId}-design`} value={lead.designKey} onChange={e=>setLead({...lead,designKey:e.target.value as LeadState["designKey"]})}>{(["designPinterest","designDrawings","designNeed3d","designNeedInterior"] as const).map(key=><option key={key} value={key}>{t(key)}</option>)}</select></label>
                    <label htmlFor={`${drawerId}-phone`}>{t("fieldPhone")}<input id={`${drawerId}-phone`} type="tel" autoComplete="tel" value={lead.phone} placeholder={t("phonePlaceholder")} onChange={e=>setLead({...lead,phone:e.target.value})}/></label>
                  </div>
                  <ContactLink method="whatsapp" about="AI Consultant Project Estimate" message={buildLiveWhatsappSummary()} className="chat-details-handoff">{t("whatsappHandoff")}<ArrowUpRight size={17}/></ContactLink>
                  <ContactLink method="phone" about="AI Consultant Phone Call" className="chat-call-link">{t("callDirect")}</ContactLink>
                  <button type="button" className="chat-details-done" onClick={()=>{setShowEstimator(false);inputRef.current?.focus();}}><Check size={16}/>{ui("detailsDone")}</button>
                </motion.aside>}
              </AnimatePresence>
            </div>
          </section>
        </motion.div>}
      </AnimatePresence>
    </dialog>
  </>;
}
