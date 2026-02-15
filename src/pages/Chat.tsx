import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type RecordingState = "recording" | "paused" | "transcribing" | "review" | "text-chat";

interface ParsedTask {
  title: string;
  dueDate: string;
  description: string;
  category: string;
}

interface ParsedEvent {
  title: string;
  start: string;
  end: string;
  description: string;
}

interface DeletionItem {
  id: string;
  type: "task" | "event";
  title: string;
}

interface ChatProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export default function Chat({ open, onClose, userId }: ChatProps) {
  const [state, setState] = useState<RecordingState>("recording");
  const [transcript, setTranscript] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(
    Array(28).fill(0.08)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [, setIsPaused] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [deletions, setDeletions] = useState<DeletionItem[]>([]);
  const [acceptedTasks, setAcceptedTasks] = useState<Set<number>>(new Set());
  const [acceptedEvents, setAcceptedEvents] = useState<Set<number>>(new Set());
  const [confirmedDeletions, setConfirmedDeletions] = useState<Set<number>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;

  // Auto-start recording when modal opens
  useEffect(() => {
    if (open) {
      setState("recording");
      setTranscript("");
      setElapsed(0);
      setParsedTasks([]);
      setParsedEvents([]);
      setDeletions([]);
      setAcceptedTasks(new Set());
      setAcceptedEvents(new Set());
      setConfirmedDeletions(new Set());
      setParsing(false);
      setChatInput("");
      setChatMessages([]);
      setChatSending(false);
      startRecording();
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [open]);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    mediaRecorderRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    audioBlobRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);

      recorder.start();
      startTimeRef.current = Date.now();

      const tick = () => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          setWaveformBars(
            Array.from({ length: 28 }, (_, i) => {
              const idx = Math.floor((i / 28) * data.length);
              return Math.max(0.06, data[idx] / 255);
            })
          );
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      alert("Microphone access denied.");
      onClose();
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      setIsPaused(true);
      setState("paused");
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      setIsPaused(false);
      setState("recording");
      // Restart waveform animation
      const tick = () => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          setWaveformBars(
            Array.from({ length: 28 }, (_, i) => {
              const idx = Math.floor((i / 28) * data.length);
              return Math.max(0.06, data[idx] / 255);
            })
          );
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const submitRecording = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || (recorder.state !== "recording" && recorder.state !== "paused")) return;
    setIsPaused(false);

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      audioBlobRef.current = blob;
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = URL.createObjectURL(blob);

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
      mediaRecorderRef.current = null;

      setState("transcribing");
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.transcript) {
          console.error("Server error:", data);
          alert(
            "Transcription failed: " +
              (data.detail || data.error || "Unknown error")
          );
          onClose();
          return;
        }
        const fullTranscript = transcriptRef.current
          ? transcriptRef.current + " " + data.transcript
          : data.transcript;
        setTranscript(fullTranscript);
        setState("review");

        // Auto-parse transcript for tasks/events
        setParsing(true);
        try {
          const parseRes = await fetch("/api/parse-transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: fullTranscript, userId }),
          });
          const parseData = await parseRes.json();
          if (parseRes.ok) {
            setParsedTasks(parseData.tasks || []);
            setParsedEvents(parseData.events || []);
            setDeletions(parseData.deletions || []);
          }
        } catch (parseErr) {
          console.error("Parse error:", parseErr);
        } finally {
          setParsing(false);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        alert("Could not reach server. Is it running?");
        onClose();
      }
    };

    recorder.stop();
  };

  const handlePlayPause = () => {
    if (!audioUrlRef.current) return;
    if (!audioElRef.current) {
      audioElRef.current = new Audio(audioUrlRef.current);
      audioElRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioElRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const reviewWaveform = useRef(
    Array.from({ length: 28 }, () => 0.15 + Math.random() * 0.7)
  ).current;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col overflow-hidden rounded-t-[24px]"
            style={{ backgroundColor: "#FAFAFB" }}
          >
            {/* Close button */}
            <div className="flex items-center px-5 pt-5">
              <button
                onClick={onClose}
                className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-surface shadow-subtle"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* ── RECORDING / PAUSED ── */}
              {(state === "recording" || state === "paused") && (
                <motion.div
                  key="rec"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 flex-col px-6 pb-10"
                >
                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Waveform – centered above text */}
                  <div className="mb-6 flex items-center justify-center gap-[4px]">
                    {waveformBars.map((h, i) => (
                      <motion.div
                        key={i}
                        className="w-[4px] rounded-full"
                        style={{ backgroundColor: "#6F8F7A" }}
                        animate={{
                          height: state === "paused"
                            ? "6px"
                            : `${Math.max(6, h * 64)}px`,
                          opacity: state === "paused"
                            ? 0.3
                            : 0.5 + h * 0.5,
                        }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      />
                    ))}
                  </div>

                  {/* Status text */}
                  <div className="mb-8 text-center">
                    <p className="text-[18px] font-semibold text-text-strong">
                      {state === "paused" ? "Paused" : "Listening..."}
                    </p>
                    <p className="mt-1 text-[15px] text-text-secondary">
                      {state === "paused"
                        ? "Tap play to continue recording."
                        : "Say everything you need to get done."}
                    </p>
                  </div>

                  {/* Bottom bar: pause/resume, submit, chat */}
                  <div className="flex items-center justify-center gap-6">
                    {/* Pause / Resume button */}
                    <button
                      onClick={state === "paused" ? resumeRecording : pauseRecording}
                      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-surface/80 shadow-subtle"
                    >
                      {state === "paused" ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="#1C1C1E"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="#1C1C1E"
                        >
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      )}
                    </button>

                    {/* Submit / done button */}
                    <button
                      onClick={submitRecording}
                      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-accent shadow-subtle transition-transform active:scale-95"
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </button>

                    {/* Switch to text chat */}
                    <button
                      onClick={() => {
                        cleanup();
                        setState("text-chat");
                      }}
                      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-surface/80 shadow-subtle"
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6F8F7A"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── TRANSCRIBING ── */}
              {state === "transcribing" && (
                <motion.div
                  key="trans"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 flex-col items-center justify-center px-6 py-20"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="h-10 w-10 rounded-full border-[3px] border-white/40 border-t-accent"
                  />
                  <p className="mt-4 text-[16px] text-text-secondary">
                    Transcribing...
                  </p>
                </motion.div>
              )}

              {/* ── TEXT CHAT ── */}
              {state === "text-chat" && (
                <motion.div
                  key="text-chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 flex-col overflow-hidden"
                >
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4">
                    {chatMessages.length === 0 && !chatSending && (
                      <div className="flex flex-1 flex-col items-center justify-center pt-20 text-center">
                        <p className="text-[18px] font-semibold text-text-strong">
                          What's on your schedule?
                        </p>
                        <p className="mt-1 text-[15px] text-text-secondary">
                          Type your tasks, events, or plans below.
                        </p>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`mb-3 max-w-[85%] rounded-[16px] px-4 py-3 text-[15px] leading-6 ${
                          msg.role === "user"
                            ? "ml-auto bg-accent text-white"
                            : "mr-auto bg-white text-text-strong shadow-subtle"
                        }`}
                      >
                        {msg.text}
                      </div>
                    ))}
                    {chatSending && (
                      <div className="mb-3 mr-auto flex items-center gap-2 rounded-[16px] bg-white px-4 py-3 shadow-subtle">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                          className="h-4 w-4 rounded-full border-2 border-white/40 border-t-accent"
                        />
                        <span className="text-[13px] text-text-secondary">Thinking...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Parsed items from chat */}
                  {(parsedTasks.length > 0 || parsedEvents.length > 0 || deletions.length > 0) && (
                    <div className="max-h-[30vh] overflow-y-auto border-t border-divider px-5 py-3">
                      <div className="space-y-3">
                        {parsedTasks.map((task, idx) => {
                          const accepted = acceptedTasks.has(idx);
                          return (
                            <motion.div
                              key={`task-${idx}`}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.08 }}
                              className="flex items-start rounded-[16px] bg-white p-4 shadow-subtle"
                              style={accepted ? { borderLeft: "3px solid #6F8F7A" } : undefined}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-text-secondary">
                                  Due {new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                </p>
                                <p className="mt-1.5 text-[17px] font-bold leading-5 text-text-strong">
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="mt-1 text-[14px] leading-5 text-text-secondary">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={async () => {
                                  if (accepted) return;
                                  try {
                                    const res = await fetch("/api/save-item", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ userId, type: "task", item: task }),
                                    });
                                    if (res.ok) setAcceptedTasks((prev) => new Set(prev).add(idx));
                                  } catch (err) {
                                    console.error("Save task error:", err);
                                  }
                                }}
                                className="ml-3 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
                                style={{ backgroundColor: accepted ? "#6F8F7A" : "#E5E7EB" }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accepted ? "white" : "#6F8F7A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              </button>
                            </motion.div>
                          );
                        })}
                        {parsedEvents.map((event, idx) => {
                          const accepted = acceptedEvents.has(idx);
                          return (
                            <motion.div
                              key={`event-${idx}`}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: (parsedTasks.length + idx) * 0.08 }}
                              className="flex items-start rounded-[16px] bg-white p-4 shadow-subtle"
                              style={accepted ? { borderLeft: "3px solid #6F8F7A" } : undefined}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-text-secondary">
                                  {new Date(event.start).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}{" "}
                                  at {new Date(event.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                </p>
                                <p className="mt-1.5 text-[17px] font-bold leading-5 text-text-strong">
                                  {event.title}
                                </p>
                                {event.description && (
                                  <p className="mt-1 text-[14px] leading-5 text-text-secondary">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={async () => {
                                  if (accepted) return;
                                  try {
                                    const res = await fetch("/api/save-item", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ userId, type: "event", item: event }),
                                    });
                                    if (res.ok) setAcceptedEvents((prev) => new Set(prev).add(idx));
                                  } catch (err) {
                                    console.error("Save event error:", err);
                                  }
                                }}
                                className="ml-3 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
                                style={{ backgroundColor: accepted ? "#6F8F7A" : "#E5E7EB" }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accepted ? "white" : "#6F8F7A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Input bar */}
                  <div className="shrink-0 px-5 pb-8 pt-3" style={{ background: "linear-gradient(to bottom, rgba(250,250,251,0), rgba(250,250,251,1) 30%)" }}>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const text = chatInput.trim();
                        if (!text || chatSending) return;
                        setChatInput("");
                        setChatMessages((prev) => [...prev, { role: "user", text }]);
                        setChatSending(true);
                        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

                        try {
                          const fullTranscript = transcriptRef.current
                            ? transcriptRef.current + " " + text
                            : text;
                          setTranscript(fullTranscript);

                          const parseRes = await fetch("/api/parse-transcript", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ transcript: fullTranscript, userId }),
                          });
                          const parseData = await parseRes.json();
                          if (parseRes.ok) {
                            const taskCount = (parseData.tasks || []).length;
                            const eventCount = (parseData.events || []).length;
                            const parts: string[] = [];
                            if (taskCount > 0) parts.push(`${taskCount} task${taskCount > 1 ? "s" : ""}`);
                            if (eventCount > 0) parts.push(`${eventCount} event${eventCount > 1 ? "s" : ""}`);
                            const reply = parts.length > 0
                              ? `Got it! I found ${parts.join(" and ")}. You can accept them below.`
                              : "I didn't find any tasks or events in that. Try being more specific with dates and times.";
                            setChatMessages((prev) => [...prev, { role: "assistant", text: reply }]);
                            setParsedTasks(parseData.tasks || []);
                            setParsedEvents(parseData.events || []);
                            setDeletions(parseData.deletions || []);
                            setAcceptedTasks(new Set());
                            setAcceptedEvents(new Set());
                            setConfirmedDeletions(new Set());
                          }
                        } catch (err) {
                          console.error("Chat parse error:", err);
                          setChatMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }]);
                        } finally {
                          setChatSending(false);
                          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
                        }
                      }}
                      className="flex items-center gap-3"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type your tasks or events..."
                        className="flex-1 rounded-full bg-white px-4 py-3 text-[15px] text-text-strong shadow-subtle outline-none placeholder:text-text-tertiary"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || chatSending}
                        className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-accent shadow-subtle transition-transform active:scale-95 disabled:opacity-40"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 19V5M5 12l7-7 7 7" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* ── REVIEW ── */}
              {state === "review" && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 flex-col overflow-hidden"
                >
                <div className="flex-1 overflow-y-auto px-5 pb-4">
                  {/* Audio bubble */}
                  <div className="mt-4 rounded-[20px] bg-white p-4 shadow-subtle">
                    {/* Player bar */}
                    <div className="mb-3 flex items-center gap-3 rounded-full bg-surface-alt px-3 py-2.5">
                      <button
                        onClick={handlePlayPause}
                        className="flex h-8 w-8 shrink-0 items-center justify-center text-accent"
                      >
                        {isPlaying ? (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect
                              x="14"
                              y="4"
                              width="4"
                              height="16"
                              rx="1"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>

                      <div className="flex flex-1 items-center gap-[2px]">
                        {reviewWaveform.map((h, i) => (
                          <div
                            key={i}
                            className="w-[3px] rounded-full bg-accent"
                            style={{
                              height: `${Math.max(4, h * 20)}px`,
                              opacity: 0.6 + h * 0.4,
                            }}
                          />
                        ))}
                      </div>

                      <span className="ml-2 text-[13px] tabular-nums text-text-secondary">
                        {formatTime(elapsed)}
                      </span>

                      <button className="ml-1 text-text-tertiary">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="5" cy="12" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="19" cy="12" r="2" />
                        </svg>
                      </button>
                    </div>

                    {/* Transcript */}
                    <div className="space-y-3 text-[15px] leading-6 text-text-strong">
                      {transcript
                        .split(/\.\s+/)
                        .filter(Boolean)
                        .map((s, i, arr) => (
                          <p key={i}>
                            {s.trim()}
                            {i < arr.length - 1
                              ? "."
                              : s.endsWith(".")
                              ? ""
                              : "."}
                          </p>
                        ))}
                    </div>
                  </div>

                  {/* Parsed items */}
                  {parsing && (
                    <div className="mt-4 flex items-center gap-2 px-1">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        className="h-4 w-4 rounded-full border-2 border-white/40 border-t-accent"
                      />
                      <span className="text-[13px] text-text-secondary">Extracting tasks & events...</span>
                    </div>
                  )}

                  {(parsedTasks.length > 0 || parsedEvents.length > 0 || deletions.length > 0) && (
                    <div className="mt-4 space-y-3">
                      {/* Task cards */}
                      {parsedTasks.map((task, idx) => {
                        const accepted = acceptedTasks.has(idx);
                        return (
                          <motion.div
                            key={`task-${idx}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className="flex items-start rounded-[16px] bg-white p-4 shadow-subtle"
                            style={accepted ? { borderLeft: "3px solid #6F8F7A" } : undefined}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-text-secondary">
                                Due {new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                              </p>
                              <p className="mt-1.5 text-[17px] font-bold leading-5 text-text-strong">
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="mt-1 text-[14px] leading-5 text-text-secondary">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                if (accepted) return;
                                try {
                                  const res = await fetch("/api/save-item", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ userId, type: "task", item: task }),
                                  });
                                  if (res.ok) {
                                    setAcceptedTasks((prev) => new Set(prev).add(idx));
                                  }
                                } catch (err) {
                                  console.error("Save task error:", err);
                                }
                              }}
                              className="ml-3 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
                              style={{
                                backgroundColor: accepted ? "#6F8F7A" : "#E5E7EB",
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accepted ? "white" : "#6F8F7A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </button>
                          </motion.div>
                        );
                      })}

                      {/* Event cards */}
                      {parsedEvents.map((event, idx) => {
                        const accepted = acceptedEvents.has(idx);
                        return (
                          <motion.div
                            key={`event-${idx}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (parsedTasks.length + idx) * 0.08 }}
                            className="flex items-start rounded-[16px] bg-white p-4 shadow-subtle"
                            style={accepted ? { borderLeft: "3px solid #6F8F7A" } : undefined}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-text-secondary">
                                {new Date(event.start).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}{" "}
                                at {new Date(event.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </p>
                              <p className="mt-1.5 text-[17px] font-bold leading-5 text-text-strong">
                                {event.title}
                              </p>
                              {event.description && (
                                <p className="mt-1 text-[14px] leading-5 text-text-secondary">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                if (accepted) return;
                                console.log("Saving event:", event);
                                try {
                                  const res = await fetch("/api/save-item", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ userId, type: "event", item: event }),
                                  });
                                  const resData = await res.json();
                                  console.log("Save event response:", res.status, resData);
                                  if (res.ok) {
                                    setAcceptedEvents((prev) => new Set(prev).add(idx));
                                  }
                                } catch (err) {
                                  console.error("Save event error:", err);
                                }
                              }}
                              className="ml-3 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
                              style={{
                                backgroundColor: accepted ? "#6F8F7A" : "#E5E7EB",
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accepted ? "white" : "#6F8F7A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </button>
                          </motion.div>
                        );
                      })}

                      {/* Deletion cards */}
                      {deletions.map((del, idx) => {
                        const confirmed = confirmedDeletions.has(idx);
                        return (
                          <motion.div
                            key={`del-${idx}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (parsedTasks.length + parsedEvents.length + idx) * 0.08 }}
                            className="flex items-start rounded-[16px] bg-white p-4 shadow-subtle"
                            style={confirmed ? { borderLeft: "3px solid #EF4444", opacity: 0.5 } : { borderLeft: "3px solid #EF4444" }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-red-400">
                                {confirmed ? "Removed" : `Remove ${del.type}`}
                              </p>
                              <p className="mt-1.5 text-[17px] font-bold leading-5 text-text-strong">
                                {del.title}
                              </p>
                            </div>
                            {!confirmed && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch("/api/delete-item", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ userId, type: del.type, itemId: del.id }),
                                    });
                                    if (res.ok) {
                                      setConfirmedDeletions((prev) => new Set(prev).add(idx));
                                    }
                                  } catch (err) {
                                    console.error("Delete error:", err);
                                  }
                                }}
                                className="ml-3 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 transition-colors"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                </div>

                {/* Done / record again – sticky bottom */}
                <div className="shrink-0 px-5 pb-8 pt-3" style={{ background: "linear-gradient(to bottom, rgba(250,250,251,0), rgba(250,250,251,1) 30%)" }}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClose}
                      className="flex h-[48px] flex-1 items-center justify-center rounded-full bg-accent text-[15px] font-medium text-white transition-transform active:scale-[0.98]"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => {
                        cleanup();
                        setState("recording");
                        setElapsed(0);
                        startRecording();
                      }}
                      className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-white shadow-subtle transition-transform active:scale-95"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="text-text-strong"
                      >
                        <path
                          d="M10 1.5C9.2 1.5 8.44 1.82 7.88 2.38C7.32 2.94 7 3.7 7 4.5V10C7 10.8 7.32 11.56 7.88 12.12C8.44 12.68 9.2 13 10 13C10.8 13 11.56 12.68 12.12 12.12C12.68 11.56 13 10.8 13 10V4.5C13 3.7 12.68 2.94 12.12 2.38C11.56 1.82 10.8 1.5 10 1.5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M16 8.5V10C16 11.59 15.37 13.12 14.24 14.24C13.12 15.37 11.59 16 10 16C8.41 16 6.88 15.37 5.76 14.24C4.63 13.12 4 11.59 4 10V8.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10 16V18.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
