import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalendarEvent } from "../lib/useEvents";

const API_BASE = "http://localhost:5001";

interface PendingEvent {
  action: "create" | "update" | "delete";
  event: { title: string; start: string; end: string; description?: string };
  eventId?: string | null;
  reply: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  pendingEvent?: PendingEvent;
  eventConfirmed?: boolean;
}

interface FloatingAssistantProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  events: CalendarEvent[];
}

/* ── Three-shape bouncing loading indicator ── */
function ThinkingDots() {
  const shapes = [
    { width: 8, height: 7, viewBox: "0 0 29 25", path: "M21.6333 0C22.9681 0.104094 24.0386 0.83307 24.7934 1.91075C25.5685 3.00821 25.8575 4.36986 25.5931 5.68214C25.0461 8.54764 21.8167 10.5302 19.1928 11.2148C18.8591 11.3019 18.3249 11.3661 18.0594 11.541L18.1543 11.6973C20.7611 13.1106 24.5205 10.6652 26.9663 10.1784C27.315 10.1177 28.0975 10.1924 28.3406 10.5011C29.7512 12.2944 28.6402 15.3338 27.4194 16.7284C26.3351 17.9687 24.7913 18.7254 23.1345 18.8276C19.1256 19.1096 17.183 16.9782 14.4873 14.6596C15.7129 17.401 20.4082 21.2419 16.6316 23.7253C14.9389 24.8355 12.8714 25.2428 10.8767 24.8591C6.54646 22.8821 9.96539 16.6931 10.9677 13.5786C10.3636 13.9381 9.87413 14.2608 9.33474 14.7033C7.65519 16.1355 5.08867 19.6262 2.72963 17.4132C-3.14951 11.8983 1.42686 9.32598 7.41625 9.32556C7.87663 9.32556 9.50469 8.97875 9.29871 8.34703C8.6172 6.19115 7.30356 4.37923 8.69599 2.17462C10.4063 -0.533312 13.8269 1.62773 15.0735 3.62752C15.549 4.39038 15.577 6.47522 16.1568 6.87086C17.8846 6.56595 18.6554 0.803285 21.6333 0Z" },
    { width: 8, height: 8, viewBox: "0 0 27 27", path: "M11.815 0.0297849C13.2359 -0.199364 14.3423 0.934247 15.1195 2.03785C16.3668 3.80701 17.344 6.3231 16.7606 8.51156C16.5076 9.45774 16.0544 10.5454 15.9157 11.4819L16.0417 11.6253C17.3228 11.5442 19.1927 5.95332 22.6009 4.80812C23.5104 4.50258 24.5417 4.46846 25.4088 4.92632C26.1203 5.30531 26.6519 5.96134 26.8837 6.7463C27.212 7.86799 26.7948 9.14495 26.2601 10.1377C24.4379 13.5264 20.8137 13.8099 17.4668 14.7707C19.4425 16.1547 22.5014 17.2405 23.8238 19.4852C24.3183 20.3074 24.4623 21.3005 24.2241 22.2344C23.9339 23.4019 23.1303 24.5693 22.0916 25.152C19.0021 26.8863 16.7119 23.4432 15.4647 21.0762C15.1227 20.2496 14.1094 17.2671 13.1861 17.3038C12.3762 18.7182 16.0269 24.0713 14.1867 25.9821C12.7626 27.4622 10.6514 27.2097 9.21354 25.9852C7.41676 24.4556 7.35429 21.5844 8.1918 19.5414C8.47661 18.8162 9.66034 17.1854 9.60634 16.5763C8.6259 15.6869 6.57502 16.8726 5.42729 16.555C2.95183 15.87 -0.672421 13.4398 0.10791 10.3744C1.48328 4.97215 7.08641 9.86511 9.75034 11.0297C9.97268 11.1093 10.2395 11.1008 10.4227 10.9336C11.5937 9.86619 9.45494 7.8577 9.14577 6.52777C8.58461 4.11374 9.79798 1.25972 11.815 0.0297849Z" },
    { width: 7, height: 9, viewBox: "0 0 28 34", path: "M13.2534 0.0280737L13.4964 0.0115122C17.0425 -0.214914 17.2828 2.94055 17.4111 5.78743C17.5424 8.70207 17.1174 11.6148 17.228 14.5408C19.1623 12.3694 20.7288 11.3604 23.7085 12.3712C26.3776 13.2767 30.6405 17.7382 25.7919 19.164C23.0588 19.9676 19.5004 19.521 16.8845 20.7304C17.5828 22.361 19.635 23.7475 20.9546 25.0436C23.4951 27.5389 23.6388 30.7416 21.3609 33.4725C21.1405 33.7365 20.4209 34.0813 20.0942 33.9828C16.4112 32.8725 14.5636 26.8003 12.2508 24.0729C12.0739 26.9197 12.8292 32.9786 9.36573 33.8672C5.48742 33.955 3.82603 30.6611 4.26529 27.0947C4.61993 24.2151 5.84418 22.4189 7.63423 20.2431C5.33207 20.4274 3.27887 21.9047 1.13332 21.6703C0.815639 21.6355 0.428592 21.3064 0.277586 21.0155C-0.0128852 20.4563 -0.0795988 19.261 0.0973522 18.6795C0.918676 15.9803 5.59533 16.3371 7.70466 15.8426C7.95478 15.7841 8.50861 15.4812 8.73989 15.3538C6.61838 12.6818 1.33008 11.644 0.191494 8.70543C-0.131487 7.87214 -0.00155335 7.01438 0.352137 6.21528C0.787366 5.23198 1.69902 3.86617 2.71837 3.49265C3.37502 3.25205 4.20852 3.32164 4.86793 3.51884C9.18772 4.81094 9.72684 11.8737 11.0064 12.3758C11.1429 12.4292 11.1653 12.3871 11.2927 12.3364C12.163 10.2671 6.64878 1.29041 13.2534 0.0280737Z" },
  ];
  return (
    <div className="flex items-end gap-1.5 px-4 py-3">
      {shapes.map((s, i) => (
        <motion.svg
          key={i}
          width={s.width}
          height={s.height}
          viewBox={s.viewBox}
          fill="none"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
        >
          <path d={s.path} fill="#6F8F7A" />
        </motion.svg>
      ))}
    </div>
  );
}

/* ── Streaming text effect ── */
function StreamingText({ text, onComplete }: { text: string; onComplete: () => void }) {
  const [displayed, setDisplayed] = useState(0);
  const speed = Math.max(8, 30 - text.length * 0.05);
  useEffect(() => {
    if (displayed >= text.length) { onComplete(); return; }
    const t = setTimeout(() => setDisplayed((d) => d + 1), speed);
    return () => clearTimeout(t);
  }, [displayed, text, speed, onComplete]);
  const visible = text.slice(0, displayed);

  return (
    <span>
      {visible.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        )
      )}
    </span>
  );
}

export default function FloatingAssistant({ open, onClose, userId, events }: FloatingAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(scrollToBottom, [messages, sending]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 300); }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const userText = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/parse-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userText, userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.error || "Something went wrong." }]);
        return;
      }
      if (data.eventAction) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          text: data.eventAction.reply || "Here's what I'd like to do:",
          pendingEvent: data.eventAction,
        }]);
        return;
      }
      if (data.chatReply) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.chatReply, streaming: true }]);
        return;
      }
      if (data.project) {
        const p = data.project;
        setMessages((prev) => [...prev, {
          role: "assistant",
          text: `**${p.title}** — due ${p.deadline}, ~${p.estimatedHours}h. Open the full assistant to generate a plan.`,
          streaming: true,
        }]);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", text: "I'm not sure what to do with that. Try asking me to create an event or plan a project!" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Could not reach server." }]);
    } finally {
      setSending(false);
    }
  }, [sending, userId]);

  const formatEventTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const confirmEvent = useCallback(async (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg.pendingEvent) return;
    const pe = msg.pendingEvent;
    setSending(true);

    try {
      if (pe.action === "create") {
        await fetch(`${API_BASE}/api/save-item`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            type: "event",
            item: { title: pe.event.title, start: pe.event.start, end: pe.event.end, description: pe.event.description || "" },
          }),
        });
      } else if (pe.action === "update" && pe.eventId) {
        // Delete old and create new
        await fetch(`${API_BASE}/api/delete-item`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, type: "event", itemId: pe.eventId }),
        });
        await fetch(`${API_BASE}/api/save-item`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            type: "event",
            item: { title: pe.event.title, start: pe.event.start, end: pe.event.end, description: pe.event.description || "" },
          }),
        });
      } else if (pe.action === "delete" && pe.eventId) {
        await fetch(`${API_BASE}/api/delete-item`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, type: "event", itemId: pe.eventId }),
        });
      }
      setMessages((prev) => prev.map((m, i) => i === msgIdx ? { ...m, eventConfirmed: true } : m));
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Failed to save the event. Try again." }]);
    } finally {
      setSending(false);
    }
  }, [messages, userId]);

  const declineEvent = useCallback((msgIdx: number) => {
    setMessages((prev) => prev.map((m, i) =>
      i === msgIdx ? { role: "assistant", text: "No problem, I've cancelled that.", pendingEvent: undefined, eventConfirmed: undefined } : m
    ));
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />

          {/* Popover panel */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed z-50 flex flex-col rounded-[20px] border border-divider bg-surface shadow-lg
              bottom-4 right-4 left-4 top-[15vh]
              lg:bottom-6 lg:right-6 lg:left-auto lg:top-auto lg:w-[400px] lg:h-[560px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-divider px-4 py-3">
              <div className="flex items-center gap-2">
                <svg width="16" height="14" viewBox="0 0 29 25" fill="none">
                  <path d="M21.6333 0C22.9681 0.104094 24.0386 0.83307 24.7934 1.91075C25.5685 3.00821 25.8575 4.36986 25.5931 5.68214C25.0461 8.54764 21.8167 10.5302 19.1928 11.2148C18.8591 11.3019 18.3249 11.3661 18.0594 11.541L18.1543 11.6973C20.7611 13.1106 24.5205 10.6652 26.9663 10.1784C27.315 10.1177 28.0975 10.1924 28.3406 10.5011C29.7512 12.2944 28.6402 15.3338 27.4194 16.7284C26.3351 17.9687 24.7913 18.7254 23.1345 18.8276C19.1256 19.1096 17.183 16.9782 14.4873 14.6596C15.7129 17.401 20.4082 21.2419 16.6316 23.7253C14.9389 24.8355 12.8714 25.2428 10.8767 24.8591C6.54646 22.8821 9.96539 16.6931 10.9677 13.5786C10.3636 13.9381 9.87413 14.2608 9.33474 14.7033C7.65519 16.1355 5.08867 19.6262 2.72963 17.4132C-3.14951 11.8983 1.42686 9.32598 7.41625 9.32556C7.87663 9.32556 9.50469 8.97875 9.29871 8.34703C8.6172 6.19115 7.30356 4.37923 8.69599 2.17462C10.4063 -0.533312 13.8269 1.62773 15.0735 3.62752C15.549 4.39038 15.577 6.47522 16.1568 6.87086C17.8846 6.56595 18.6554 0.803285 21.6333 0Z" fill="#6F8F7A"/>
                </svg>
                <span className="text-small leading-small font-semibold text-text-strong">Assistant</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-tertiary hover:bg-subtle-fill transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 && !sending && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <p className="text-body leading-body text-text-secondary">
                    Ask me to create events, reschedule meetings, or plan projects.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className="mb-3">
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`max-w-[85%] rounded-[14px] px-3 py-2 text-small leading-small ${
                      msg.role === "user"
                        ? "ml-auto bg-subtle-fill text-text-strong"
                        : "mr-auto text-text-strong"
                    }`}
                  >
                    {msg.streaming ? (
                      <StreamingText
                        text={msg.text}
                        onComplete={() => {
                          setMessages((prev) => prev.map((m, idx) => idx === i ? { ...m, streaming: false } : m));
                        }}
                      />
                    ) : (
                      msg.text.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                          <strong key={j}>{part.slice(2, -2)}</strong>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )
                    )}
                  </motion.div>

                  {/* Event confirmation card */}
                  {msg.pendingEvent && !msg.eventConfirmed && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="mr-auto mt-2 max-w-[85%] rounded-[14px] border border-divider bg-white p-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                        <div className="min-w-0 flex-1">
                          <p className="text-small leading-small font-semibold text-text-strong">{msg.pendingEvent.event.title}</p>
                          <p className="mt-1 text-caption leading-caption text-text-secondary">
                            {formatEventTime(msg.pendingEvent.event.start)} — {formatEventTime(msg.pendingEvent.event.end)}
                          </p>
                          {msg.pendingEvent.event.description && (
                            <p className="mt-1 text-caption leading-caption text-text-tertiary">{msg.pendingEvent.event.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => confirmEvent(i)}
                          disabled={sending}
                          className="flex-1 rounded-[10px] bg-accent py-1.5 text-caption leading-caption font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
                        >
                          {msg.pendingEvent.action === "delete" ? "Delete" : msg.pendingEvent.action === "update" ? "Update" : "Add to calendar"}
                        </button>
                        <button
                          onClick={() => declineEvent(i)}
                          className="flex-1 rounded-[10px] bg-subtle-fill py-1.5 text-caption leading-caption font-medium text-text-secondary transition-colors hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Confirmed badge */}
                  {msg.eventConfirmed && (
                    <div className="mr-auto mt-1.5 flex items-center gap-1.5 pl-3 text-caption leading-caption text-accent font-medium">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {msg.pendingEvent?.action === "delete" ? "Event deleted" : msg.pendingEvent?.action === "update" ? "Event updated" : "Added to calendar"}
                    </div>
                  )}
                </div>
              ))}
              {sending && <ThinkingDots />}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-divider px-3 py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="relative"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Add an event, reschedule, ask anything..."
                  className="w-full rounded-[12px] border border-divider bg-background px-3 py-2.5 pr-12 text-small leading-small text-text-strong placeholder:text-text-tertiary outline-none focus:border-accent/40 transition-colors"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-dark disabled:opacity-30"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
