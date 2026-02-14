import { useState } from "react";

export default function Chat() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setRecording(true);

      setTimeout(() => {
        mediaRecorder.stop();
        setRecording(false);
      }, 4000); // record 4 seconds
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone access denied.");
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("audio", audioBlob);

    try {
      const res = await fetch("http://localhost:5001/api/transcribe", {
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
        onClick={startRecording}
        className="bg-black text-white px-4 py-3 rounded-lg"
      >
        {recording ? "Recording..." : "🎙 Record (4s)"}
      </button>

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
