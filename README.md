# Attenborofy

A web application that adds video narration in the style of Sir David Attenborough.

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Python](https://www.python.org/) 3.12+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [ffmpeg](https://ffmpeg.org/) (video processing)
- An [ElevenLabs](https://elevenlabs.io/) API key
- An [OpenAI](https://platform.openai.com/) API key (or Azure OpenAI endpoint)

### Setup

```bash
# Clone and enter the repo
git clone <repo-url> && cd attenborofy

# Copy the example env file and fill in your API keys
cp .env.example .env

# Install backend dependencies
cd backend && uv sync && cd ..

# Install frontend dependencies and build
cd frontend && npm install && npm run build && cd ..
```

### Run

```bash
cd backend && uv run python app.py
```

Open [http://localhost:5001](http://localhost:5001) in your browser.

## How It Works

1. **Upload** — you upload a short video (10–30 seconds)
2. **Extract frames** — the backend pulls evenly-spaced frames from the video
3. **Generate narration** — frames are sent to a GPT vision model which writes a David Attenborough-style narration
4. **Text-to-speech** — the narration is converted to audio via ElevenLabs
5. **Compose** — the original audio is mixed with the narration and subtitles are burned in, producing the final video

## Voice Configuration

The app ships with a paid ElevenLabs voice clone in `backend/config.json` that closely resembles Sir David Attenborough. **FREE users won't have access to this voice.**

The `.env.example` file includes `ELEVENLABS_VOICE_ID` set to "George" (`JBFqnCBsd6RMkjVDRZzb`), a free built-in British male voice — the closest free alternative. When this env var is set, it overrides the voice in `config.json`.

To use a different voice, replace the `ELEVENLABS_VOICE_ID` value in your `.env` with any ElevenLabs voice ID.

## Project Structure

```
backend/
  app.py            # Flask API server
  pipeline.py       # Video processing pipeline (frames → narration → TTS → compose)
  app_config.py     # Loads config.json
  config.json       # Voice ID, TTS tuning, video duration limits
  jobs.py           # Background job management
frontend/
  src/              # React + TypeScript (Vite)
```
