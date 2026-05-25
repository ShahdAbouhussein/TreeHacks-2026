import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckSquare } from "lucide-react";

const API_BASE = "http://localhost:5001";

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
  overlap?: {
    title: string;
    start: string;
    end: string;
  };
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
  const [liveText, setLiveText] = useState("");
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const barsRef = useRef<number[]>(Array(28).fill(0.06));

  // Map FFT bins outward from the center so loud (low-freq) energy lands in the middle,
  // but each bar reads a unique bin (no symmetric lock-step). Smoothed with an EMA.
  const buildCenteredBars = (data: Uint8Array, count: number) => {
    const usable = Math.floor(data.length * 0.6);
    const binWidth = Math.max(1, Math.floor(usable / count));
    const raw: number[] = new Array(count);
    for (let i = 0; i < count; i++) {
      let sum = 0;
      for (let j = 0; j < binWidth; j++) sum += data[i * binWidth + j];
      raw[i] = sum / binWidth / 255;
    }
    const center = Math.floor(count / 2);
    const next: number[] = new Array(count).fill(0);
    for (let bin = 0; bin < count; bin++) {
      const offset = Math.ceil(bin / 2);
      const sign = bin % 2 === 0 ? -1 : 1;
      const pos = Math.max(0, Math.min(count - 1, center + sign * offset));
      next[pos] = raw[bin];
    }
    const prev = barsRef.current;
    const blended = next.map((v, i) => Math.max(0.06, (prev[i] ?? 0.06) * 0.55 + v * 0.45));
    barsRef.current = blended;
    return blended;
  };

  const startSpeechRecognition = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";
    let finalText = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setLiveText((finalText + interim).trim());
    };
    recog.onerror = () => {};
    recog.onend = () => {
      // SR auto-stops after silence; restart while we're still the active recognizer.
      if (recognitionRef.current === recog) {
        try { recog.start(); } catch { /* ignore */ }
      }
    };
    try { recog.start(); } catch { /* ignore */ }
    recognitionRef.current = recog;
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch { /* ignore */ }
    }
  };

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
      setLiveText("");
      startRecording();
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [open]);

  const cleanup = () => {
    stopSpeechRecognition();
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
      analyser.fftSize = 256;
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
          setWaveformBars(buildCenteredBars(data, 28));
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      startSpeechRecognition();
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
      stopSpeechRecognition();
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
          setWaveformBars(buildCenteredBars(data, 28));
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      startSpeechRecognition();
    }
  };

  const submitRecording = () => {
    stopSpeechRecognition();
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
        const res = await fetch(`${API_BASE}/api/transcribe`, {
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
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const clientDate = new Date().toLocaleDateString("en-CA");
          const parseRes = await fetch(`${API_BASE}/api/parse-transcript`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: fullTranscript, userId, timeZone, clientDate }),
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
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-[24px]"
            style={{ backgroundColor: "#FAFAFB", height: "calc(100vh - 140px)" }}
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
                  {/* Top spacer */}
                  <div className="flex-1" />

                  {/* Waveform – fixed-height row so siblings don't shift as bars pulse */}
                  <div className="mb-6 flex h-24 items-center justify-center gap-[5px]">
                    {waveformBars.map((h, i) => (
                      <motion.div
                        key={i}
                        className="w-[4px] rounded-full"
                        style={{ backgroundColor: "#6F8F7A" }}
                        animate={{
                          height: state === "paused"
                            ? "6px"
                            : `${Math.max(6, h * 80)}px`,
                          opacity: state === "paused"
                            ? 0.3
                            : 0.5 + h * 0.5,
                        }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ))}
                  </div>

                  {/* Status text */}
                  <div className="mb-4 text-center">
                    <p className="text-body leading-body font-semibold text-text-strong">
                      {state === "paused" ? "Paused" : "Listening..."}
                    </p>
                    <p className="mt-1 text-body leading-body text-text-secondary">
                      {state === "paused"
                        ? "Tap play to continue recording."
                        : "Say everything you need to get done."}
                    </p>
                  </div>

                  {/* Bottom spacer (smaller — keeps content lower in the sheet but buttons pinned) */}
                  <div className="flex-[0.5]" />

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
                  <p className="mt-4 text-body leading-body text-text-secondary">
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
                        <p className="text-body leading-body font-semibold text-text-strong">
                          What's on your schedule?
                        </p>
                        <p className="mt-1 text-body leading-body text-text-secondary">
                          Type your tasks, events, or plans below.
                        </p>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`mb-3 max-w-[85%] rounded-[16px] px-4 py-3 text-secondary leading-body ${
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
                        <motion.svg
                          width="20"
                          height="16"
                          viewBox="0 0 49 39"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          animate={{
                            y: [0, -3, 0, 2, 0],
                            rotate: [0, -8, 0, 8, 0],
                            scale: [1, 1.05, 1, 0.95, 1],
                          }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <path d="M40.1328 0.030652C41.8301 -0.200838 44.4242 0.924777 45.8063 1.86093C47.2807 2.85959 48.5803 4.33524 48.9059 6.11753C49.1179 7.27843 48.9955 8.66324 48.2933 9.64301C45.6498 13.3299 36.1121 14.7777 31.7339 15.3079C30.7629 15.4251 29.7899 15.5256 28.8156 15.6094C28.4076 15.6458 27.9599 15.6708 27.551 15.7154C27.4835 15.7228 27.4641 15.7685 27.4384 15.8142C27.4374 17.114 34.8789 20.3045 36.2391 20.9446C36.6579 21.1433 37.0698 21.3562 37.4735 21.583C38.8204 22.3404 40.0227 23.2028 41.094 24.2935C43.1221 26.3586 44.2149 28.9427 44.1188 31.826C44.1098 32.0979 44.104 32.6661 44.0265 32.9126C43.7268 33.8636 42.8678 34.9103 42.1576 35.5809C40.4625 37.1818 38.3303 38.0833 35.9753 38.0145C34.275 37.9646 32.5219 37.5287 31.115 36.5613C27.9722 34.4002 26.3571 30.1019 25.533 26.5798C25.3369 25.7238 25.1684 24.8619 25.028 23.9954C24.9593 23.5702 24.9104 22.7519 24.8196 22.3863C24.6396 21.6619 23.994 20.5228 23.465 19.9841C23.1505 19.6638 22.71 19.3714 22.247 19.3732C21.9286 19.3745 21.411 19.5801 21.1916 19.8119C20.4372 20.6089 20.804 21.7553 20.8677 22.6999C20.9133 23.3644 20.9343 24.0302 20.9307 24.696C20.929 28.1582 20.1842 31.6617 18.6754 34.7989C18.4044 35.3624 17.9894 36.213 17.5232 36.6338C15.4722 38.4378 12.1491 39.0003 9.48248 39C7.28493 38.9997 4.77996 38.4356 3.20479 36.8526C2.47697 36.0698 2.02847 34.9176 2.06889 33.8493C2.26728 28.6087 5.87401 24.024 9.94391 20.9518C10.8159 20.2935 11.8868 19.6977 12.8148 19.0961C14.4975 18.0088 16.151 16.8779 17.7736 15.7046C19.0508 14.7733 20.3919 13.7365 21.5161 12.6311C21.8766 12.2459 22.7302 11.3976 22.6529 10.8392C22.4981 9.72276 21.3866 9.82168 20.6363 10.1991C19.488 10.7769 18.7255 11.6241 17.779 12.4268C16.2713 13.7029 14.8124 15.0346 13.1296 16.0922C12.3512 16.5813 11.041 17.0427 10.161 17.384C9.84634 17.5061 8.36765 17.6897 7.99306 17.6807C5.93169 17.6312 3.56187 16.8393 2.00107 15.4835C1.75095 15.2592 1.31753 14.785 1.1738 14.5178C0.575788 13.4059 0.0585924 11.9605 0.00460554 10.7012C-0.0531781 9.35317 0.43516 8.40385 1.3352 7.44466C1.83415 6.91292 2.65277 6.22554 3.28944 5.90241C4.67542 5.19893 6.2873 4.66945 7.78014 4.24057C10.5818 3.44947 13.4305 2.83105 16.3098 2.3889C18.2495 2.08339 20.286 1.83393 22.2456 1.76012C23.8504 1.74569 26.1522 1.60406 27.3917 2.80955C29.1071 4.47781 28.516 7.66571 27.6318 9.61979C27.1134 10.7966 25.8072 12.4664 25.7704 13.7549C25.7351 14.9926 29.0175 12.8822 29.3343 12.6622C30.8353 11.6198 32.3086 10.3844 33.2357 8.79669C33.5921 8.18626 33.8868 7.43657 34.1564 6.78499C34.464 6.03031 34.7797 5.279 35.1042 4.53122C35.4432 3.75642 36.055 2.4739 36.6172 1.83911C37.3465 1.01547 39.0176 0.118624 40.1328 0.030652Z" fill="#6F8F7A"/>
                        </motion.svg>
                        <span className="text-caption leading-caption text-text-secondary">Thinking...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Parsed items from chat */}
                  {(parsedTasks.length > 0 || parsedEvents.length > 0 || deletions.length > 0) && (
                    <div className="max-h-[30vh] overflow-y-auto border-t border-divider px-5 py-3">
                      <div className="space-y-2">
                        {parsedTasks.map((task, idx) => {
                          const accepted = acceptedTasks.has(idx);
                          return (
                            <motion.div
                              key={`task-${idx}`}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.08 }}
                              className="flex items-center rounded-[10px] py-[14px] pl-[16px] pr-[12px]"
                              style={{ backgroundColor: "#F7F7F7", border: "1px solid rgba(111,143,122,0.05)", boxShadow: "0 0 0 1px #F4F3EF" }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-caption leading-caption text-text-secondary">
                                  Due {new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                                </p>
                                <p className="mt-1 text-body leading-body font-medium text-text-strong">
                                  {task.title}
                                </p>
                              </div>
                              <button
                                onClick={async () => {
                                  if (accepted) return;
                                  try {
                                    const res = await fetch(`${API_BASE}/api/save-item`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ userId, type: "task", item: task }),
                                    });
                                    if (res.ok) setAcceptedTasks((prev) => new Set(prev).add(idx));
                                  } catch (err) {
                                    console.error("Save task error:", err);
                                  }
                                }}
                                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors"
                                style={{ backgroundColor: accepted ? "#6F8F7A" : "#E5E7EB" }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accepted ? "white" : "#6F8F7A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              </button>
                            </motion.div>
                          );
                        })}
                        {parsedEvents.map((event, idx) => {
                          const accepted = acceptedEvents.has(idx);
                          const conflict = event.overlap;
                          const startDt = new Date(event.start);
                          const timeStr = `${startDt.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} at ${startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
                          return (
                            <motion.div
                              key={`event-${idx}`}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: (parsedTasks.length + idx) * 0.08 }}
                            >
                              <div
                                className="flex items-center rounded-[10px] py-[14px] pl-[16px] pr-[12px]"
                                style={{
                                  backgroundColor: conflict ? "#FEF3C7" : "#F7F7F7",
                                  border: "1px solid rgba(111,143,122,0.05)", boxShadow: "0 0 0 1px #F4F3EF",
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-caption leading-caption text-text-secondary">{timeStr}</p>
                                  <p className="mt-1 text-body leading-body font-medium text-text-strong">
                                    {event.title}
                                  </p>
                                  {conflict && (
                                    <p className="mt-1 text-caption leading-caption font-medium" style={{ color: "#B45309" }}>
                                      Conflicts with "{conflict.title}" ({new Date(conflict.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – {new Date(conflict.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })})
                                    </p>
                                  )}
                                </div>
                                {!conflict && (
                                  <button
                                    onClick={async () => {
                                      if (accepted) return;
                                      try {
                                        const res = await fetch(`${API_BASE}/api/save-item`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ userId, type: "event", item: event }),
                                        });
                                        if (res.ok) setAcceptedEvents((prev) => new Set(prev).add(idx));
                                      } catch (err) {
                                        console.error("Save event error:", err);
                                      }
                                    }}
                                    className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors"
                                    style={{ backgroundColor: accepted ? "#6F8F7A" : "#E5E7EB" }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accepted ? "white" : "#6F8F7A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                  </button>
                                )}
                              </div>
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

                          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                          const clientDate = new Date().toLocaleDateString("en-CA");
                          const parseRes = await fetch(`${API_BASE}/api/parse-transcript`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ transcript: fullTranscript, userId, timeZone, clientDate }),
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
                        className="flex-1 rounded-full bg-white px-4 py-3 text-body leading-body text-text-strong shadow-subtle outline-none placeholder:text-text-tertiary"
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

                      <span className="ml-2 text-caption leading-caption tabular-nums text-text-secondary">
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
                    <div className="space-y-3 text-secondary leading-body text-text-strong">
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
                      <span className="text-caption leading-caption text-text-secondary">Extracting tasks & events...</span>
                    </div>
                  )}

                  {(parsedTasks.length > 0 || parsedEvents.length > 0 || deletions.length > 0) && (
                    <div className="mt-4 space-y-2">
                      {/* Task cards */}
                      {parsedTasks.map((task, idx) => {
                        const accepted = acceptedTasks.has(idx);
                        return (
                          <motion.div
                            key={`task-${idx}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className="flex items-center gap-3 rounded-xl py-[12px] pl-[12px] pr-[12px]"
                            style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(111,143,122,0.05)", boxShadow: "0 0 0 1px #F4F3EF" }}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#F0F5F2", border: "1px solid rgba(111,143,122,0.18)" }}>
                              <CheckSquare size={16} color="#6F8F7A" strokeWidth={1.75} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-caption leading-caption text-text-secondary">
                                Due {new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                              </p>
                              <p className="mt-1 text-body leading-body font-medium text-text-strong">
                                {task.title}
                              </p>
                            </div>
                            <button
                              onClick={async () => {
                                if (accepted) return;
                                try {
                                  const res = await fetch(`${API_BASE}/api/save-item`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ userId, type: "task", item: task }),
                                  });
                                  if (res.ok) setAcceptedTasks((prev) => new Set(prev).add(idx));
                                } catch (err) {
                                  console.error("Save task error:", err);
                                }
                              }}
                              className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors"
                              style={{ backgroundColor: accepted ? "#6F8F7A" : "#E5E7EB" }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accepted ? "white" : "#6F8F7A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </button>
                          </motion.div>
                        );
                      })}

                      {/* Event cards */}
                      {parsedEvents.map((event, idx) => {
                        const accepted = acceptedEvents.has(idx);
                        const conflict = event.overlap;
                        const startDt = new Date(event.start);
                        const timeStr = `${startDt.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} at ${startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
                        return (
                          <motion.div
                            key={`event-${idx}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (parsedTasks.length + idx) * 0.08 }}
                          >
                            <div
                              className="flex items-center rounded-xl py-[14px] pl-[16px] pr-[12px]"
                              style={{
                                backgroundColor: "#FFFFFF",
                                border: "1px solid rgba(111,143,122,0.05)", boxShadow: "0 0 0 1px #F4F3EF",
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-caption leading-caption text-text-secondary">{timeStr}</p>
                                <p className="mt-1 text-body leading-body font-medium text-text-strong">
                                  {event.title}
                                </p>
                                {conflict && (
                                  <p className="mt-1 text-caption leading-caption font-medium" style={{ color: "#B45309" }}>
                                    Conflicts with "{conflict.title}" ({new Date(conflict.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – {new Date(conflict.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })})
                                  </p>
                                )}
                              </div>
                              {!conflict && (
                                <button
                                  onClick={async () => {
                                    if (accepted) return;
                                    try {
                                      const res = await fetch(`${API_BASE}/api/save-item`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ userId, type: "event", item: event }),
                                      });
                                      if (res.ok) setAcceptedEvents((prev) => new Set(prev).add(idx));
                                    } catch (err) {
                                      console.error("Save event error:", err);
                                    }
                                  }}
                                  className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors"
                                  style={{ backgroundColor: accepted ? "#6F8F7A" : "#E5E7EB" }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accepted ? "white" : "#6F8F7A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                </button>
                              )}
                            </div>
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
                              <p className="text-caption leading-caption font-medium text-red-400">
                                {confirmed ? "Removed" : `Remove ${del.type}`}
                              </p>
                              <p className="mt-1.5 text-body leading-body font-bold text-text-strong">
                                {del.title}
                              </p>
                            </div>
                            {!confirmed && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${API_BASE}/api/delete-item`, {
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
                      className="flex h-[48px] flex-1 items-center justify-center rounded-full bg-accent text-body leading-body font-medium text-white transition-transform active:scale-[0.98]"
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
