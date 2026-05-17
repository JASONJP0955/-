# Java backend

This service owns the AI backend work for the app:

- OpenAI / Google speech transcription
- Japanese conversation continuation
- Detailed correction feedback
- OpenAI text-to-speech
- Random starter topic selection

The Next.js app still keeps the browser UI, Supabase auth cookies, and history persistence. Its `/api/*` routes proxy AI work to this Java service.

## Local run

From the repository root:

```powershell
cd backend-java
.\build.ps1
.\run.ps1
```

The default URL is:

```text
http://127.0.0.1:8080
```

Then keep the Next.js app running in another terminal:

```powershell
npm run dev
```

## Environment

The Java service reads the same AI environment variables as the old Next backend:

```text
OPENAI_API_KEY
OPENAI_CHAT_MODEL
STT_PROVIDER
OPENAI_STT_MODEL
OPENAI_TTS_MODEL
OPENAI_TTS_VOICE
GOOGLE_SPEECH_ACCESS_TOKEN
GOOGLE_SPEECH_API_KEY
GOOGLE_SPEECH_MODEL
GOOGLE_SPEECH_SAMPLE_RATE
```

The Next.js app calls the Java service through:

```text
JAVA_BACKEND_URL=http://127.0.0.1:8080
```

For production, deploy this Java service to a Java-capable host, then set `JAVA_BACKEND_URL` in Vercel to that public backend URL.
