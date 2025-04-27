from flask import Flask, request, jsonify, send_from_directory
import os
import threading
from openai import OpenAI
from deep_translator import GoogleTranslator
from gtts import gTTS
from pydub import AudioSegment
import dotenv
from flask_cors import CORS
import yt_dlp

dotenv.load_dotenv()

app = Flask(__name__)
CORS(app)

TRANSLATIONS_DIR = "/Users/sahildhull/temp/translations"
os.makedirs(TRANSLATIONS_DIR, exist_ok=True)

translation_status = {}  # Store status: { (video_id, language): "pending"/"done" }

openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

lang_map = {
    'Hindi': 'hi',
    'Spanish': 'es',
    'German': 'de',
    'Japanese': 'ja'
}


def download_audio(video_id):
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(TRANSLATIONS_DIR, f"{video_id}.%(ext)s"),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True
    }
    url = f"https://www.youtube.com/watch?v={video_id}"

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

# Helper function: Add silence
def add_silence(duration_ms):
    return AudioSegment.silent(duration=duration_ms)

# Core function to process translation
def process_translation(video_id, language):
    translation_status[(video_id, language)] = "processing"
    print("Downloading audio...")

    if os.path.exists(os.path.join(TRANSLATIONS_DIR, f"{video_id}_{language}.mp3")):
        print(f"translated audio already exists for {video_id}")
        translation_status[(video_id, language)] = "done"
        return
    
    # 1. Download audio
    try:
        if os.path.exists(os.path.join(TRANSLATIONS_DIR, f"{video_id}.mp3")):
            print(f"Audio already exists for {video_id}")
        else:
            download_audio(video_id)
            print(f"Downloaded audio for {video_id}")
    except Exception as e:
        print(f"Error downloading audio: {e}")
        translation_status[(video_id, language)] = "error"
        return

    download_path = os.path.join(TRANSLATIONS_DIR, f"{video_id}.mp3")

    # 2. Transcribe
    print("Transcribing audio...")
    try:
        audio_file = open(download_path, "rb")
        transcript_response = openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json"  # To get timestamps
        )
        audio_file.close()
        segments = transcript_response.segments
        print(f"Transcribed {len(segments)} segments in {transcript_response.duration} seconds")
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        translation_status[(video_id, language)] = "error"
        return

    # 3. Translate + 4. TTS + 5. Merge
    print("Translating and merging...")
    try:
        final_audio = AudioSegment.empty()
        translator = GoogleTranslator(source='en', target=lang_map[language])

        for i, seg in enumerate(segments):
            try:
                start_time = seg.start * 1000  # ms
                end_time = seg.end * 1000

                text = seg.text
                translated_text = translator.translate(text)
                print(f"Translating: {text} -> {translated_text}")

                tts = gTTS(translated_text, lang=lang_map[language])
                tts_path = os.path.join(TRANSLATIONS_DIR, f"tts_{i}.mp3")
                tts.save(tts_path)

                tts_audio = AudioSegment.from_mp3(tts_path)

                if final_audio.duration_seconds * 1000 < start_time:
                    gap_duration = start_time - final_audio.duration_seconds * 1000
                    final_audio += add_silence(gap_duration)

                final_audio += tts_audio

                os.remove(tts_path)  # Clean up intermediate tts files
            except Exception as e:
                print(f"Error processing segment {i}: {e}")
                break
                # Continue with next segment

        output_path = os.path.join(TRANSLATIONS_DIR, f"{video_id}_{language}.mp3")
        final_audio.export(output_path, format="mp3")
        print(f"Exported final audio to {output_path}")

        translation_status[(video_id, language)] = "done"
    except Exception as e:
        print(f"Error in translation/TTS/merge process: {e}")
        translation_status[(video_id, language)] = "error"
    
    print("Translation completed")



@app.route("/translate", methods=["POST"])
def translate_video():
    data = request.get_json()
    video_id = data["videoId"]
    language = data["language"]  # 'hi', 'es', 'de', 'ja' for Hindi, Spanish, German, Japanese
    print(f"Translating video {video_id} to {language}")

    if (video_id, language) in translation_status and translation_status[(video_id, language)] == "done":
        return jsonify({"status": "already_done"})

    translation_status[(video_id, language)] = "pending"

    threading.Thread(target=process_translation, args=(video_id, language)).start()

    return jsonify({"status": "started"})

@app.route("/check_status", methods=["GET"])
def check_status():
    video_id = request.args.get("video_id")
    language = request.args.get("language")

    status = translation_status.get((video_id, language), "not_started")
    return jsonify({"status": status})

@app.route("/get_audio", methods=["GET"])
def get_audio():
    video_id = request.args.get("video_id")
    language = request.args.get("language")

    file_path = os.path.join(TRANSLATIONS_DIR, f"{video_id}_{language}.mp3")
    if os.path.exists(file_path):
        return send_from_directory(TRANSLATIONS_DIR, f"{video_id}_{language}.mp3")
    else:
        return "Audio not ready", 404

if __name__ == "__main__":
    app.run(port=5000)