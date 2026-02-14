import sys
import whisper
import subprocess
import os

audio_path = sys.argv[1]
wav_path = audio_path + ".wav"

# Convert to wav using ffmpeg
subprocess.run([
    "ffmpeg",
    "-y",
    "-i", audio_path,
    wav_path
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

model = whisper.load_model("base")
result = model.transcribe(wav_path)

print(result["text"])

# Clean up converted file
os.remove(wav_path)

