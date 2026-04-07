import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalendarEvent } from "../lib/useEvents";
import { InlineDatePicker } from "../components/InlineDatePicker";

const API_BASE = "http://localhost:5001";

const KALI_PATH =
  "M40.1328 0.030652C41.8301 -0.200838 44.4242 0.924777 45.8063 1.86093C47.2807 2.85959 48.5803 4.33524 48.9059 6.11753C49.1179 7.27843 48.9955 8.66324 48.2933 9.64301C45.6498 13.3299 36.1121 14.7777 31.7339 15.3079C30.7629 15.4251 29.7899 15.5256 28.8156 15.6094C28.4076 15.6458 27.9599 15.6708 27.551 15.7154C27.4835 15.7228 27.4641 15.7685 27.4384 15.8142C27.4374 17.114 34.8789 20.3045 36.2391 20.9446C36.6579 21.1433 37.0698 21.3562 37.4735 21.583C38.8204 22.3404 40.0227 23.2028 41.094 24.2935C43.1221 26.3586 44.2149 28.9427 44.1188 31.826C44.1098 32.0979 44.104 32.6661 44.0265 32.9126C43.7268 33.8636 42.8678 34.9103 42.1576 35.5809C40.4625 37.1818 38.3303 38.0833 35.9753 38.0145C34.275 37.9646 32.5219 37.5287 31.115 36.5613C27.9722 34.4002 26.3571 30.1019 25.533 26.5798C25.3369 25.7238 25.1684 24.8619 25.028 23.9954C24.9593 23.5702 24.9104 22.7519 24.8196 22.3863C24.6396 21.6619 23.994 20.5228 23.465 19.9841C23.1505 19.6638 22.71 19.3714 22.247 19.3732C21.9286 19.3745 21.411 19.5801 21.1916 19.8119C20.4372 20.6089 20.804 21.7553 20.8677 22.6999C20.9133 23.3644 20.9343 24.0302 20.9307 24.696C20.929 28.1582 20.1842 31.6617 18.6754 34.7989C18.4044 35.3624 17.9894 36.213 17.5232 36.6338C15.4722 38.4378 12.1491 39.0003 9.48248 39C7.28493 38.9997 4.77996 38.4356 3.20479 36.8526C2.47697 36.0698 2.02847 34.9176 2.06889 33.8493C2.26728 28.6087 5.87401 24.024 9.94391 20.9518C10.8159 20.2935 11.8868 19.6977 12.8148 19.0961C14.4975 18.0088 16.151 16.8779 17.7736 15.7046C19.0508 14.7733 20.3919 13.7365 21.5161 12.6311C21.8766 12.2459 22.7302 11.3976 22.6529 10.8392C22.4981 9.72276 21.3866 9.82168 20.6363 10.1991C19.488 10.7769 18.7255 11.6241 17.779 12.4268C16.2713 13.7029 14.8124 15.0346 13.1296 16.0922C12.3512 16.5813 11.041 17.0427 10.161 17.384C9.84634 17.5061 8.36765 17.6897 7.99306 17.6807C5.93169 17.6312 3.56187 16.8393 2.00107 15.4835C1.75095 15.2592 1.31753 14.785 1.1738 14.5178C0.575788 13.4059 0.0585924 11.9605 0.00460554 10.7012C-0.0531781 9.35317 0.43516 8.40385 1.3352 7.44466C1.83415 6.91292 2.65277 6.22554 3.28944 5.90241C4.67542 5.19893 6.2873 4.66945 7.78014 4.24057C10.5818 3.44947 13.4305 2.83105 16.3098 2.3889C18.2495 2.08339 20.286 1.83393 22.2456 1.76012C23.8504 1.74569 26.1522 1.60406 27.3917 2.80955C29.1071 4.47781 28.516 7.66571 27.6318 9.61979C27.1134 10.7966 25.8072 12.4664 25.7704 13.7549C25.7351 14.9926 29.0175 12.8822 29.3343 12.6622C30.8353 11.6198 32.3086 10.3844 33.2357 8.79669C33.5921 8.18626 33.8868 7.43657 34.1564 6.78499C34.464 6.03031 34.7797 5.279 35.1042 4.53122C35.4432 3.75642 36.055 2.4739 36.6172 1.83911C37.3465 1.01547 39.0176 0.118624 40.1328 0.030652Z";

interface ParsedProject {
  title: string;
  description: string;
  deadline: string;
  estimatedHours: number;
  subComponents: string[];
}

interface PlanTask {
  title: string;
  description: string;
  scheduledDate: string;
  estimatedMinutes: number;
  order: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  project?: ParsedProject;
  projectId?: string;
  plan?: PlanTask[];
  planAccepted?: boolean;
  streaming?: boolean;
  fileName?: string;
}

interface AssistantPageProps {
  userId: string;
  events: CalendarEvent[];
}

/* ── Kali logo loading indicator ── */
function KaliThinking() {
  return (
    <div className="mb-3 mr-auto px-4 py-3">
      <motion.svg
        width="22"
        height="17"
        viewBox="0 0 49 39"
        fill="none"
        animate={{
          opacity: [0.3, 1, 0.3],
          y: [0, -2, 0],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <path d={KALI_PATH} fill="#6F8F7A" />
      </motion.svg>
    </div>
  );
}

/* ── Streaming text effect ── */
function StreamingText({ text, onComplete }: { text: string; onComplete: () => void }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (displayed >= text.length) {
      onComplete();
      return;
    }
    const speed = text[displayed] === " " ? 8 : 18;
    const timer = setTimeout(() => setDisplayed((d) => d + 1), speed);
    return () => clearTimeout(timer);
  }, [displayed, text.length]);

  const visible = text.slice(0, displayed);
  const upcoming = text.slice(displayed, displayed + 3);

  return (
    <span>
      {visible.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        )
      )}
      {displayed < text.length && (
        <span className="text-text-tertiary" style={{ filter: "blur(2px)" }}>{upcoming}</span>
      )}
    </span>
  );
}

export default function AssistantPage({ userId, events }: AssistantPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [viewingPlanIdx, setViewingPlanIdx] = useState<number | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(28).fill(0.08));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  const scrollToBottom = () => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(scrollToBottom, [messages, sending]);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  /* ── Send text message ── */
  const sendMessage = async (text: string) => {
    if ((!text.trim() && !stagedFile) || sending) return;
    const userText = text.trim();
    setInput("");
    setError("");

    // If there's a staged file, send it with the text as context
    if (stagedFile) {
      const file = stagedFile;
      setStagedFile(null);
      await handleFileUpload(file, userText || undefined);
      return;
    }
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
        setSending(false);
        return;
      }
      // Handle chat reply (not a project)
      if (data.chatReply) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.chatReply, streaming: true }]);
        setSending(false);
        return;
      }
      const p = data.project;
      const summaryParts = [`**${p.title}** — due ${formatDate(p.deadline)}, ~${p.estimatedHours}h.`];

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: summaryParts.join(" "),
          project: p,
          projectId: data.projectId,
          streaming: true,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Could not reach server. Is it running?" }]);
    } finally {
      setSending(false);
    }
  };

  /* ── Generate plan ── */
  const generatePlan = async (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg.project || !msg.projectId || sending) return;
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/generate-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, projectId: msg.projectId, project: msg.project }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.error || "Failed to generate plan." }]);
        setSending(false);
        return;
      }
      setMessages((prev) => {
        const newIdx = prev.length;
        setTimeout(() => setViewingPlanIdx(newIdx), 0);
        return [
          ...prev,
          {
            role: "assistant",
            text: `Plan ready — ${(data.tasks || []).length} tasks spread across ${formatDate(msg.project!.deadline)}.`,
            streaming: true,
            plan: data.tasks || [],
            project: msg.project,
            projectId: msg.projectId,
          },
        ];
      });
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Could not reach server." }]);
    } finally {
      setSending(false);
    }
  };

  /* ── Accept plan ── */
  const acceptPlan = async (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg.projectId || !msg.project || !msg.plan || sending) return;
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/accept-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, projectId: msg.projectId, tasks: msg.plan, deadline: msg.project.deadline }),
      });
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: "Failed to save plan." }]);
        setSending(false);
        return;
      }
      // Mark the plan message as accepted
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIdx ? { ...m, planAccepted: true } : m))
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Plan saved! Your tasks have been added to your task list." },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Could not reach server." }]);
    } finally {
      setSending(false);
    }
  };

  /* ── File upload ── */
  const handleFileUpload = async (file: File, context?: string) => {
    setSending(true);
    setError("");
    const userText = context || "";
    setMessages((prev) => [...prev, { role: "user", text: userText, fileName: file.name }]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      if (context) formData.append("context", context);
      const res = await fetch(`${API_BASE}/api/parse-document`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.error || "Failed to parse document." }]);
        setSending(false);
        return;
      }
      const p = data.project;
      const parts = [`**${p.title}** — due ${formatDate(p.deadline)}, ~${p.estimatedHours}h.`];

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: parts.join(" "),
          project: p,
          projectId: data.projectId,
          streaming: true,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Could not reach server." }]);
    } finally {
      setSending(false);
    }
  };

  /* ── Voice recording ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);

      const tick = () => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const count = 28;
          const usable = Math.floor(data.length * 0.75);
          const binWidth = Math.floor(usable / count);
          setWaveformBars(
            Array.from({ length: count }, (_, i) => {
              let sum = 0;
              for (let j = 0; j < binWidth; j++) sum += data[i * binWidth + j];
              return Math.max(0.06, sum / binWidth / 255);
            })
          );
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Microphone access denied.");
    }
  };

  const submitRecording = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setElapsed(0);

      setMessages((prev) => [...prev, { role: "user", text: "🎙 Voice message" }]);
      setSending(true);

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      try {
        const res = await fetch(`${API_BASE}/api/transcribe`, { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || !data.transcript) {
          setMessages((prev) => [...prev, { role: "assistant", text: "Transcription failed. Try again." }]);
          setSending(false);
          return;
        }
        // Now parse the transcript as a project
        await sendTranscript(data.transcript);
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", text: "Could not reach server." }]);
        setSending(false);
      }
    };
    recorder.stop();
  };

  const cancelRecording = () => {
    cleanup();
    setIsRecording(false);
    setElapsed(0);
  };

  const sendTranscript = async (transcript: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/parse-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript, userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.error || "Failed to parse." }]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `I heard you! Here's what I parsed: **${data.project.title}**. Review and generate a plan when ready.`,
          project: data.project,
          projectId: data.projectId,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Could not reach server." }]);
    } finally {
      setSending(false);
    }
  };

  /* ── Group plan tasks by date ── */
  const groupPlan = (plan: PlanTask[]) => {
    const grouped: Record<string, PlanTask[]> = {};
    for (const task of plan) {
      if (!grouped[task.scheduledDate]) grouped[task.scheduledDate] = [];
      grouped[task.scheduledDate].push(task);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  };

  /* ── Edit a plan task inline ── */
  const updatePlanTask = (msgIdx: number, taskIdx: number, field: keyof PlanTask, value: string | number) => {
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIdx || !m.plan) return m;
        const updated = m.plan.map((t, j) => (j === taskIdx ? { ...t, [field]: value } : t));
        return { ...m, plan: updated };
      })
    );
  };

  /* ── Edit project inline ── */
  const updateProject = (msgIdx: number, field: keyof ParsedProject, value: any) => {
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIdx || !m.project) return m;
        return { ...m, project: { ...m.project, [field]: value } };
      })
    );
  };

  const planMsg = viewingPlanIdx !== null ? messages[viewingPlanIdx] : null;

  return (
    <div className="relative mx-auto max-w-[402px] lg:max-w-none bg-background min-h-screen flex flex-col lg:flex-row">
      {/* Mobile header */}
      <div className="lg:hidden px-lg pt-[52px] pb-2">
        <p className="text-body leading-body text-text-secondary">Assistant</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setStagedFile(file);
          e.target.value = "";
        }}
      />

      {/* Left: Chat area */}
      <div className="flex flex-1 flex-col min-w-0 lg:px-8 lg:pt-8">

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-0 lg:max-w-[640px] lg:mx-auto lg:w-full pt-4 pb-4">
        {/* Landing state */}
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center w-full max-w-[600px] mx-auto px-4" style={{ minHeight: "calc(100vh - 120px)" }}>
            <div className="text-center">
              <h1 className="font-serif text-display leading-display lg:text-[36px] lg:leading-[44px] font-normal text-text-strong">
                What can I help you with?
              </h1>
            </div>

            <div className="mt-10 w-full">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (input.trim()) sendMessage(input.trim());
                }}
                className="relative"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe your project, assignment, or goal..."
                  rows={3}
                  className="w-full resize-none rounded-[16px] border border-divider bg-surface px-4 pt-4 pb-14 pr-28 text-body leading-body text-text-strong placeholder:text-text-tertiary outline-none focus:border-accent/40 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim()) sendMessage(input.trim());
                    }
                  }}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-subtle-fill text-text-secondary transition-colors hover:bg-gray-200"
                    title="Upload file"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-subtle-fill text-text-secondary transition-colors hover:bg-gray-200"
                    title="Record voice"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-dark disabled:opacity-30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </button>
                </div>
              </form>

              {/* Staged file indicator */}
              {stagedFile && (
                <div className="mt-2 flex items-center gap-2 text-caption leading-caption text-text-secondary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="flex-1 truncate">{stagedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setStagedFile(null)}
                    className="shrink-0 text-text-tertiary hover:text-text-strong"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div key={i} className="mb-4">
            {/* File card */}
            {msg.fileName && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto max-w-[85%] mb-2"
              >
                <div className="rounded-[14px] border border-divider bg-white p-3 shadow-subtle inline-flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-red-50">
                    <span className="text-label leading-label font-bold text-red-400">PDF</span>
                  </div>
                  <span className="text-small leading-small font-medium text-text-strong truncate max-w-[200px]">{msg.fileName}</span>
                </div>
              </motion.div>
            )}

            {/* Bubble (hide if file-only with no text) */}
            {(msg.text || !msg.fileName) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`max-w-[85%] rounded-[16px] px-4 py-3 text-body leading-body ${
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
            )}

            {/* Project parsed — show Generate plan button (hide if streaming or plan already exists) */}
            {msg.role === "assistant" && msg.project && !msg.plan && !msg.streaming && !messages.some((m) => m.plan && m.projectId === msg.projectId) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="mr-auto mt-2 pl-4"
              >
                <button
                  onClick={() => generatePlan(i)}
                  disabled={sending}
                  className="rounded-[12px] bg-accent px-4 py-2 text-small leading-small font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
                >
                  Generate plan
                </button>
              </motion.div>
            )}

            {/* Plan generated — show green arrow to open panel */}
            {msg.role === "assistant" && msg.plan && msg.plan.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="mr-auto mt-2 pl-4"
              >
                {msg.planAccepted ? (
                  <div className="flex items-center gap-2 text-caption leading-caption text-accent font-medium">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Plan saved
                  </div>
                ) : (
                  <button
                    onClick={() => setViewingPlanIdx(i)}
                    className="flex items-center gap-1.5 text-small leading-small font-medium text-accent transition-colors hover:text-accent-dark"
                  >
                    View plan
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6F8F7A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(-45deg)" }}>
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </motion.div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {sending && <KaliThinking />}

        <div ref={endRef} />
      </div>

      {/* Recording bar (overlays input when active) */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="sticky bottom-0 bg-background px-4 pb-8 pt-3 lg:max-w-[600px] lg:mx-auto lg:w-full"
          >
            <div className="rounded-[16px] bg-white p-4 shadow-subtle">
              {/* Waveform */}
              <div className="mb-3 flex items-center justify-center gap-[4px]">
                {waveformBars.map((h, j) => (
                  <motion.div
                    key={j}
                    className="w-[3px] rounded-full"
                    style={{ backgroundColor: "#6F8F7A" }}
                    animate={{ height: `${Math.max(4, h * 40)}px`, opacity: 0.5 + h * 0.5 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="text-caption leading-caption tabular-nums text-text-tertiary">{formatTime(elapsed)}</span>
                <button
                  onClick={cancelRecording}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-subtle-fill text-text-secondary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={submitRecording}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-subtle transition-transform active:scale-95"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar (only show after first message) */}
      {!isRecording && messages.length > 0 && (
        <div className="sticky bottom-0 px-4 pb-10 pt-5 lg:max-w-[640px] lg:mx-auto lg:w-full bg-background">
          {error && <p className="mb-2 text-small leading-small text-red-500">{error}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your project, assignment, or goal..."
              className="w-full rounded-[16px] border border-divider bg-surface px-4 py-3 pr-28 text-body leading-body text-text-strong placeholder:text-text-tertiary outline-none focus:border-accent/40 transition-colors"
              disabled={sending}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-subtle-fill text-text-secondary transition-colors hover:bg-gray-200"
                disabled={sending}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <button
                type="button"
                onClick={startRecording}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-subtle-fill text-text-secondary transition-colors hover:bg-gray-200"
                disabled={sending}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-dark disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>

            {/* Staged file indicator */}
            {stagedFile && (
              <div className="mt-2 flex items-center gap-2 text-caption leading-caption text-text-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="flex-1 truncate">{stagedFile.name}</span>
                <button type="button" onClick={() => setStagedFile(null)} className="shrink-0 text-text-tertiary hover:text-text-strong">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      </div>{/* end left chat area */}

      {/* Right: Plan split panel (desktop) */}
      <AnimatePresence>
        {planMsg?.plan && viewingPlanIdx !== null && (
          <motion.div
            key="plan-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "420px", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="hidden lg:flex flex-col shrink-0 border-l border-divider bg-background overflow-hidden"
            style={{ height: "100vh", position: "sticky", top: 0 }}
          >
            <div className="flex-1 overflow-y-auto px-lg py-2xl">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-title leading-title font-medium text-text-strong">
                    {planMsg.project?.title}
                  </h2>
                  <p className="mt-xs text-caption leading-caption text-text-secondary mb-xl">
                    {planMsg.plan!.length} tasks · Due {formatDate(planMsg.project!.deadline)} · ~{planMsg.project!.estimatedHours}h
                  </p>
                </div>
                <button
                  onClick={() => setViewingPlanIdx(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-subtle-fill transition-colors mt-0.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Editable plan timeline */}
              <div className="space-y-xl">
                {groupPlan(planMsg.plan!).map(([date, tasks]) => (
                  <div key={date}>
                    <div className="flex items-center gap-sm mb-md">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                      <span className="text-small leading-small font-medium text-text-strong">{formatDate(date)}</span>
                      <span className="text-label leading-label text-text-tertiary">
                        {tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)}m
                      </span>
                    </div>
                    <div className="ml-md border-l-2 border-divider pl-md space-y-sm">
                      {tasks.sort((a, b) => a.order - b.order).map((task) => {
                        const globalIdx = planMsg.plan!.indexOf(task);
                        return (
                          <div key={globalIdx} className="rounded-[12px] bg-surface-alt px-lg py-md">
                            <input
                              value={task.title}
                              onChange={(e) => updatePlanTask(viewingPlanIdx, globalIdx, "title", e.target.value)}
                              className="w-full bg-transparent text-body leading-body font-medium text-text-strong outline-none"
                            />
                            <div className="mt-xs flex items-center gap-sm">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenDatePicker(openDatePicker === globalIdx ? null : globalIdx)}
                                  className="flex items-center gap-xs text-caption leading-caption text-text-secondary hover:text-accent transition-colors"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" />
                                  </svg>
                                  {task.scheduledDate}
                                </button>
                                <AnimatePresence>
                                  {openDatePicker === globalIdx && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute left-0 top-full z-[60] mt-xs"
                                    >
                                      <InlineDatePicker
                                        value={task.scheduledDate}
                                        onChange={(d) => {
                                          updatePlanTask(viewingPlanIdx, globalIdx, "scheduledDate", d);
                                          setOpenDatePicker(null);
                                        }}
                                      />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <span className="text-caption leading-caption text-text-tertiary">·</span>
                              <div className="flex items-center gap-xs">
                                <input
                                  type="number"
                                  value={task.estimatedMinutes}
                                  onChange={(e) => updatePlanTask(viewingPlanIdx, globalIdx, "estimatedMinutes", Number(e.target.value))}
                                  className="w-12 bg-transparent text-caption leading-caption text-text-secondary outline-none text-right"
                                  min={1}
                                />
                                <span className="text-caption leading-caption text-text-secondary">min</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions (sticky bottom) */}
            {!planMsg.planAccepted ? (
              <div className="shrink-0 border-t border-divider px-lg py-lg flex items-center gap-sm">
                <button
                  onClick={() => { setViewingPlanIdx(null); generatePlan(viewingPlanIdx); }}
                  disabled={sending}
                  className="rounded-[12px] bg-subtle-fill px-lg py-sm text-small leading-small font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-40 transition-colors"
                >
                  Regenerate
                </button>
                <button
                  onClick={() => { acceptPlan(viewingPlanIdx); setViewingPlanIdx(null); }}
                  disabled={sending}
                  className="rounded-[12px] bg-accent px-lg py-sm text-small leading-small font-medium text-white hover:bg-accent-dark disabled:opacity-40 transition-colors"
                >
                  Accept plan
                </button>
              </div>
            ) : (
              <div className="shrink-0 border-t border-divider px-lg py-lg flex items-center gap-sm text-caption leading-caption text-accent font-medium">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Plan accepted
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: Plan as bottom sheet */}
      <AnimatePresence>
        {planMsg?.plan && viewingPlanIdx !== null && (
          <motion.div
            key="plan-mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setViewingPlanIdx(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[20px] bg-white p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title leading-title font-medium text-text-strong">{planMsg.project?.title}</h2>
                <button onClick={() => setViewingPlanIdx(null)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-subtle-fill">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-4">
                {groupPlan(planMsg.plan!).map(([date, tasks]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                      <span className="text-small leading-small font-medium text-text-strong">{formatDate(date)}</span>
                    </div>
                    <div className="ml-3 border-l-2 border-divider pl-3 space-y-2.5">
                      {tasks.sort((a, b) => a.order - b.order).map((task, j) => (
                        <div key={j} className="rounded-[10px] bg-background px-3 py-2.5">
                          <p className="text-body leading-body font-medium text-text-strong">{task.title}</p>
                          {task.description && <p className="mt-0.5 text-caption leading-caption text-text-secondary">{task.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {!planMsg.planAccepted && (
                <div className="mt-6 flex items-center gap-2">
                  <button onClick={() => { setViewingPlanIdx(null); generatePlan(viewingPlanIdx!); }} disabled={sending} className="flex-1 rounded-[12px] bg-subtle-fill py-2.5 text-small leading-small font-medium text-text-secondary disabled:opacity-40">Regenerate</button>
                  <button onClick={() => { acceptPlan(viewingPlanIdx!); setViewingPlanIdx(null); }} disabled={sending} className="flex-1 rounded-[12px] bg-accent py-2.5 text-small leading-small font-medium text-white disabled:opacity-40">Accept</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
