import { useRef, useState } from "react";

export default function Chat() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [progress, setProgress] = useState(1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimeoutRef = useRef<number | null>(null);
  const recordRafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartRef = useRef<number | null>(null);
  const recordingRef = useRef(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      mediaRecorder.start();
      setRecording(true);
      recordingRef.current = true;
      setSecondsLeft(30);
      setProgress(1);
      recordStartRef.current = performance.now();

      recordTimeoutRef.current = window.setTimeout(() => {
        mediaRecorder.stop();
        setRecording(false);
        recordTimeoutRef.current = null;
      }, 30000); // record up to 30 seconds

      const tick = () => {
        if (!recordStartRef.current) return;
        const elapsedMs = performance.now() - recordStartRef.current;
        const remainingMs = Math.max(0, 30000 - elapsedMs);
        setSecondsLeft(Math.ceil(remainingMs / 1000));
        setProgress(Math.max(0, remainingMs / 30000));
        if (remainingMs > 0 && recordingRef.current) {
          recordRafRef.current = requestAnimationFrame(tick);
        }
      };
      recordRafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (recordTimeoutRef.current !== null) {
      clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }
    recordingRef.current = false;
    if (recordRafRef.current !== null) {
      cancelAnimationFrame(recordRafRef.current);
      recordRafRef.current = null;
    }
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRecording(false);
    setSecondsLeft(0);
    setProgress(0);
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("audio", audioBlob);

    try {
      const res = await fetch("api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setTranscript(data.transcript);
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Transcription failed.");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Voice Command</h2>

      <button
        onClick={recording ? stopRecording : startRecording}
        className="bg-black text-white px-4 py-3 rounded-lg"
      >
        {recording ? "Stop Recording" : "🎙 Record (up to 30s)"}
      </button>

      <div className="flex flex-col gap-2">
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-black origin-left transition-transform duration-100"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
        <div className="text-sm text-gray-600">
          {recording ? `${secondsLeft}s left` : "Ready to record"}
        </div>
      </div>

      <button
        onClick={transcribeAudio}
        disabled={!audioBlob || loading}
        className="bg-gray-800 text-white px-4 py-3 rounded-lg disabled:opacity-50"
      >
        {loading ? "Transcribing..." : "Send to Whisper"}
      </button>

      {transcript && (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
          <p className="font-medium mb-2">Transcript:</p>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}
