"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { chatReturnOrigin, markChatEntry } from "@/lib/chat-navigation";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ArrowUpRight, CalendarCheck, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Copy, ImageIcon, Images, MessageCircle, Plus, RotateCcw, Square, SquarePen, X, Ruler } from "lucide-react";
import ProjectRequestForm from "@/app/_components/ProjectRequestForm";
import { fetchWithEnquirySession } from "@/lib/request-client";
import { assistantHistory, MAX_CHAT_MESSAGE } from "@/lib/assistant-request";
import { type ProjectBrief } from "@/lib/project-request";
import ThemeToggle from "@/app/_components/ThemeToggle";
import { Link } from "@/i18n/navigation";
import type { AssistantUi } from "@/lib/assistant-media";
import type { Locale } from "@/i18n/routing";

interface ChatMessage { role: "user" | "assistant"; content: string; ui?: AssistantUi }

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

export default function AssistantChat() {
  const requestCopy = useTranslations("request");
  const [projectBrief, setProjectBrief] = useState<Partial<ProjectBrief>>({});
  const [formBrief, setFormBrief] = useState<Partial<ProjectBrief>>();
  const t = useTranslations("home.aiIsland");
  const ui = useTranslations("assistant");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const drawerId = useId();
  const pageRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const pendingPrompt = useRef<string | null>(null);
  const busyRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followReplyRef = useRef(true);
  const detailsToggleRef = useRef<HTMLButtonElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionsButtonRef = useRef<HTMLButtonElement>(null);
  const motionPreference = useReducedMotion();
  const [restored, setRestored] = useState(false);
  // The server cannot read the media query. Keep the first render identical.
  const reducedMotion = !restored || motionPreference;
  const storageKey = `kg:chat:${locale}`;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lightbox, setLightbox] = useState<{ message: number; index: number } | null>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const [slideDirection, setSlideDirection] = useState(1);

  const closeDetails = () => {
    setShowRequest(false);
    requestAnimationFrame(() => detailsToggleRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    if (!showSuggestions) return;
    suggestionsRef.current?.querySelector<HTMLButtonElement>("[data-ai-chip]")?.focus({ preventScroll: true });
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !suggestionsRef.current?.contains(event.target)) setShowSuggestions(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [showSuggestions]);

  useEffect(() => {
    markChatEntry();
    const page = pageRef.current;
    const viewport = window.visualViewport;
    const fit = () => {
      if (!page || !viewport) return;
      page.style.setProperty("--chat-viewport-height", `${viewport.height}px`);
      page.style.setProperty("--chat-viewport-top", `${viewport.offsetTop}px`);
      if (followReplyRef.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    };
    fit();
    viewport?.addEventListener("resize", fit);
    viewport?.addEventListener("scroll", fit);
    return () => {
      viewport?.removeEventListener("resize", fit);
      viewport?.removeEventListener("scroll", fit);
      requestRef.current?.abort();
    };
  }, []);
  const exitChat = () => {
    const previous = chatReturnOrigin();
    if (previous && history.length > 1) router.back();
    else router.replace(previous?.url || `/${locale}`, { scroll: false });
  };
  useEffect(() => {
    // Restore after hydration so server and first client markup agree.
    const frame = requestAnimationFrame(() => {
      try {
        pendingPrompt.current ??= sessionStorage.getItem("kg:chat-prompt");
        sessionStorage.removeItem("kg:chat-prompt");
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
        if (saved) {
          const history = Array.isArray(saved.messages) ? saved.messages.filter((m: ChatMessage) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.trim()) : [];
          setMessages(history);
          setInput(typeof saved.input === "string" ? saved.input.slice(0, MAX_CHAT_MESSAGE) : "");
          setProjectBrief(saved.brief || {});
          setFailedQuestion(saved.failedQuestion || (history.at(-1)?.role === "user" ? history.at(-1).content : null));
        }
      } catch { /* Storage is optional. */ }
      setRestored(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);
  useEffect(() => {
    if (!restored) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ messages: messages.filter(m => m.content.trim()), input, brief: projectBrief, failedQuestion })); }
    catch { /* Chat works with storage disabled or full. */ }
  }, [restored, storageKey, messages, input, projectBrief, failedQuestion]);

  useEffect(() => {
    if (!showRequest) return;
    const frame = requestAnimationFrame(() => {
      pageRef.current?.querySelector<HTMLInputElement>("[data-ai-request-form] input")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [showRequest]);
  useLayoutEffect(() => {
    // Scroll before paint: a layout change must not be mistaken for the
    // visitor scrolling up and disable following the incoming answer.
    if (followReplyRef.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);
  useEffect(() => {
    if (!scrollRef.current) return;
    const scroll = scrollRef.current;
    // Keep the latest answer visible as photos load, without interrupting reading.
    const observer = new ResizeObserver(() => {
      if (followReplyRef.current) scroll.scrollTop = scroll.scrollHeight;
    });
    if (scroll.firstElementChild) observer.observe(scroll.firstElementChild);
    return () => observer.disconnect();
  }, [messages.length]);
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 144)}px`;
  }, [input]);

  const sendQuestion = useCallback(async (question: string, retry = false) => {
    const trimmed = question.trim();
    if (!trimmed || busyRef.current || !restored) return;
    followReplyRef.current = true;
    setShowSuggestions(false);
    busyRef.current = true;
    const history = retry ? messages.slice(0, messages.findLastIndex(message => message.role === "user") + 1) : messages;
    const nextMessages: ChatMessage[] = retry ? history : [...history.filter(message => message.content.trim()), { role: "user", content: trimmed }];
    const responseIndex = nextMessages.length;
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    if (!retry) setInput("");
    setFailedQuestion(null);
    setCopied(null);
    setStopped(false);
    setLoading(true);
    const controller = new AbortController();
    requestRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 55000);
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
      const response = await fetchWithEnquirySession("/api/ai-consultant", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, shown, messages: assistantHistory(nextMessages), brief: projectBrief }),
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
          if (item.ui) attachUi(item.ui);
          if (item.brief && typeof item.brief === "object") setProjectBrief(item.brief);
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
        if (data.ui) attachUi(data.ui);
        if (data.brief && typeof data.brief === "object") setProjectBrief(data.brief);
      }
      if (!reply.trim()) throw new Error("Empty response");
    } catch {
      if (!controller.signal.aborted || timedOut) setFailedQuestion(trimmed);
      else setStopped(true);
      if (!reply.trim()) setMessages(previous => previous.filter((_, index) => index !== responseIndex));
    } finally {
      window.clearTimeout(timeout);
      requestRef.current = null;
      busyRef.current = false;
      setLoading(false);
    }
  }, [locale, messages, projectBrief, restored]);

  useEffect(() => {
    if (!restored || !pendingPrompt.current) return;
    const prompt = pendingPrompt.current;
    pendingPrompt.current = null;
    void sendQuestion(prompt);
  }, [restored, sendQuestion]);

  const newChat = () => {
    requestRef.current?.abort();
    setMessages([]);
    setProjectBrief({});
    setFormBrief(undefined);
    setCopied(null);
    setInput("");
    setFailedQuestion(null);
    setStopped(false);
    setShowRequest(false);
    setShowSuggestions(false);
    setLightbox(null);
    followReplyRef.current = true;
    if (matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  };
  const copyMessage = async (index: number) => {
    try { await navigator.clipboard.writeText(messages[index].content); setCopied(index); }
    catch { setCopied(null); }
  };

  const suggestions = [
    { key: "chip1", label: "promptCost", icon: Ruler },
    { key: "chip2", label: "promptTime", icon: Clock3 },
    { key: "chip3", label: "promptPhoto", icon: ImageIcon },
  ] as const;
  const toggleDetails = () => { if (showRequest) closeDetails(); else reviewRequest(); };
  const lightboxMedia = lightbox ? messages[lightbox.message]?.ui?.media ?? [] : [];
  const activePhoto = lightbox ? lightboxMedia[lightbox.index] : undefined;
  const openLightbox = (message: number, index: number) => { setSlideDirection(1); setLightbox({ message, index }); };
  const closeLightbox = () => {
    const current = lightbox;
    setLightbox(null);
    if (!current) return;
    requestAnimationFrame(() => pageRef.current?.querySelector<HTMLButtonElement>(`[data-ai-media="${current.message}-${current.index}"]`)?.focus({ preventScroll: true }));
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
  const reviewRequest = () => {
    if (busyRef.current) return;
    setShowSuggestions(false);
    setLightbox(null);
    setFormBrief({ ...projectBrief });
    setShowRequest(true);
  };
  const galleryHref = (category: AssistantUi["category"] | undefined) => (category ? `/gallery/${category}` : "/gallery") as "/gallery";
  const photoPrompt = locale === "ka"
    ? "მაჩვენეთ თქვენი შესრულებული სამზარეულოების და პროექტების ფოტოები"
    : locale === "ru"
      ? "Покажите фотографии ваших кухонь и проектов"
      : "Show me photos of your completed kitchens and projects";
  return <main ref={pageRef} id={drawerId} className="chat-page" aria-label={t("drawerTitle")}
      onKeyDown={event=>{
        if (lightbox && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          stepLightbox(event.key === "ArrowLeft" ? -1 : 1);
          return;
        }
        if (event.key === "Escape" && showSuggestions) {
          event.preventDefault();
          event.stopPropagation();
          setShowSuggestions(false);
          suggestionsButtonRef.current?.focus({ preventScroll: true });
          return;
        }
        if (event.key === "Escape") {
          if (lightbox) closeLightbox();
          else if (showRequest) closeDetails();
        }
      }}
      >
        <div className="chat-workspace">
          <section className={`chat-context ${messages.length===0?"is-empty":""} ${showRequest?"has-request":""}`} data-ai-drawer data-lenis-prevent>
            <header className="chat-header" inert={!!lightbox}>
              <div className="chat-identity"><span className="chat-identity-mark" aria-hidden="true"><MessageCircle size={18}/></span><div><h1>Kencho AI</h1><p>{ui("note")}</p></div></div>
              <div className="chat-toolbar">
                <ThemeToggle />
                <button type="button" data-ai-new-chat className="chat-icon-button" aria-label={ui("newChat")} title={ui("newChat")} onClick={newChat} disabled={loading}><SquarePen size={19}/></button>
                <button type="button" onClick={reviewRequest} disabled={loading || showRequest} className="chat-cta-pill is-primary chat-header-request" data-ai-request aria-label={requestCopy("reviewBrief")} title={requestCopy("reviewBrief")}><CalendarCheck size={15} aria-hidden="true"/><span>{requestCopy("reviewBrief")}</span></button>
                <button type="button" data-ai-exit onClick={exitChat} className="chat-icon-button" aria-label={ui("backToSite")} title={ui("backToSite")}><ChevronLeft size={21}/></button>
              </div>
            </header>
            <div className="chat-stage">
              <div className="chat-thread-frame" hidden={showRequest} inert={showRequest || !!lightbox}>
                <div className="chat-body">
                  <div ref={scrollRef} className="chat-conversation" tabIndex={0} role="region" aria-label={ui("assistant")} onScroll={event=>{const el=event.currentTarget;followReplyRef.current=el.scrollHeight-el.scrollTop-el.clientHeight<80;}}>
                    {messages.length===0 ? <motion.div key="welcome" className="chat-welcome-stage"
                      initial={reducedMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:reducedMotion?0:0.2,ease:EASE}}>
                      <div className="chat-welcome">
                        <h3>{ui("welcomeTitle")}</h3>
                        <p>{ui("welcomeText")}</p>
                      </div>
                      <div className="chat-starters" role="group" aria-label={t("chipsLabel")}>
                        {suggestions.map(({key,label,icon:Icon}) => <button key={key} type="button" disabled={!restored} onClick={() => void sendQuestion(t(key))}>
                          <Icon size={20} strokeWidth={1.5} aria-hidden="true"/><span>{ui(label)}</span><ArrowUpRight size={15} aria-hidden="true"/>
                        </button>)}
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
                            <button type="button" onClick={reviewRequest} data-ai-request className="chat-cta-pill is-primary">
                              <CalendarCheck size={15} aria-hidden="true"/><span>{requestCopy("reviewBrief")}</span><ArrowUpRight size={14} aria-hidden="true"/>
                            </button>
                            <Link href={galleryHref(message.ui?.category)} data-ai-gallery className="chat-cta-pill">
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
                      {loading && !messages.at(-1)?.content && <div className="chat-thinking" role="status"><span className="chat-thinking-dot" aria-hidden="true"/><span>{t("thinking")}</span></div>}
                      {stopped && <p className="chat-stopped" role="status">{ui("stopped")}</p>}
                      {failedQuestion && <div className="chat-error" role="alert"><p>{ui("error")}</p><button type="button" onClick={()=>void sendQuestion(failedQuestion,true)}>{ui("retry")}</button></div>}
                    </motion.div>}
                  </div>
                </div>
                <div className="chat-bottom-dock">
                  <div className="chat-composer-row">
                  <form className="chat-composer" onSubmit={event=>{event.preventDefault();void sendQuestion(input);}}>
                    <textarea ref={inputRef} rows={1} disabled={!restored} aria-label={ui("messageLabel")} value={input} enterKeyHint="enter" autoComplete="off" maxLength={MAX_CHAT_MESSAGE} placeholder={ui("shortPlaceholder")} onChange={event=>setInput(event.target.value)}
                      onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing&&matchMedia("(pointer:fine)").matches){event.preventDefault();void sendQuestion(input);}}}/>
                    <div className="chat-composer-tools">
                      <button ref={detailsToggleRef} type="button" className="chat-icon-button" data-ai-details-toggle aria-label={ui("details")} title={ui("details")} aria-expanded={showRequest} aria-controls={`${drawerId}-details`} onClick={toggleDetails}>
                        <Plus size={22} style={{transform:showRequest?"rotate(45deg)":"none",transition:reducedMotion?"none":"transform .2s cubic-bezier(.22,1,.36,1)"}}/>
                      </button>
                  <div ref={suggestionsRef} className="chat-suggestions-control"
                    onBlur={event=>{if (!event.currentTarget.contains(event.relatedTarget)) setShowSuggestions(false);}}>
                    <button ref={suggestionsButtonRef} type="button" data-ai-suggestions-toggle className="chat-suggestions-toggle"
                      aria-expanded={showSuggestions} aria-controls={`${drawerId}-suggestions`}
                      onClick={()=>{setShowRequest(false);setShowSuggestions(value=>!value);}}>
                      {ui("suggestions")}<ChevronDown size={14} aria-hidden="true"/>
                    </button>
                    {showSuggestions && <div id={`${drawerId}-suggestions`} data-ai-suggestions-panel className="chat-suggestions-panel" role="region" aria-label={ui("suggestions")}>
                      <div className="chat-suggestions-group" role="group" aria-label={t("chipsLabel")}>
                        {suggestions.map(({key,label,icon:Icon})=><button key={key} type="button" data-ai-chip disabled={loading} className="chat-suggestion" onClick={()=>void sendQuestion(t(key))}><Icon size={16} strokeWidth={1.5} aria-hidden="true"/><span>{ui(label)}</span></button>)}
                      </div>
                      <div className="chat-suggestions-group" role="group" aria-label={ui("actionsLabel")}>
                        <button type="button" data-ai-show-photos disabled={loading} className="chat-suggestion" onClick={()=>void sendQuestion(photoPrompt)}><ImageIcon size={16} aria-hidden="true"/><span>{ui("photosLabel")}</span></button>
                        <button type="button" onClick={reviewRequest} className="chat-suggestion" data-ai-request><CalendarCheck size={16} aria-hidden="true"/><span>{requestCopy("reviewBrief")}</span></button>
                        <Link href="/gallery" data-ai-gallery className="chat-suggestion"><Images size={16} aria-hidden="true"/><span>{ui("openGallery")}</span><ArrowUpRight size={14} aria-hidden="true"/></Link>
                      </div>
                    </div>}
                  </div>
                      {loading ? <button type="button" className="chat-send" data-ai-stop aria-label={ui("stop")} title={ui("stop")} onClick={()=>requestRef.current?.abort()}><Square size={15} fill="currentColor"/></button> : <button type="submit" className="chat-send" disabled={!restored || !input.trim()} aria-label={t("send")} title={t("send")}><ArrowUp size={21} strokeWidth={2}/></button>}
                    </div>
                  </form>
                  </div>
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
                    <button type="button" onClick={reviewRequest} className="chat-cta-pill is-primary" data-ai-request><CalendarCheck size={15}/><span>{requestCopy("reviewBrief")}</span></button>
                    <Link href={galleryHref(messages[lightbox.message]?.ui?.category)} className="chat-cta-pill">
                      <Images size={15} aria-hidden="true"/>
                      <span>{ui("openGallery")}</span>
                      <ArrowUpRight size={14} aria-hidden="true"/>
                    </Link>
                  </div>
                </motion.div>}
              </AnimatePresence>
              {formBrief && <div id={`${drawerId}-details`} data-ai-request-form className="chat-request" hidden={!showRequest}>
                <button type="button" className="chat-request-back" onClick={closeDetails}><ChevronLeft size={17} aria-hidden="true"/>{ui("detailsDone")}</button>
                <ProjectRequestForm initialBrief={formBrief} onDraftChange={setProjectBrief} />
              </div>}

            </div>
          </section>
        </div>
    </main>;
}
