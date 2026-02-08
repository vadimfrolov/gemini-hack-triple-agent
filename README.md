# Fortune Teller Web App

A minimalist web application that uses Google DeepMind's Gemini 3 API to generate mystical fortune predictions. Built with HTML, CSS, JavaScript, and Cloudflare Workers.

## Gemini 3 Integration

The Fortune Teller web application leverages Google DeepMind's Gemini 3 API to power its "Council of Fate" - an innovative multi-agent system that provides users with diverse perspectives on their questions. When a user submits a query via text or voice input, the application orchestrates sequential API calls to Gemini 3, with each request representing a distinct AI persona: the balanced Fortune Teller, the blunt Realist, and the mystical Wise Cat.

Built on Cloudflare Workers, the backend proxy routes user queries directly to Gemini 3's generative API, utilizing the model's advanced reasoning capabilities and expansive 128,000 token context window. The implementation employs a chain-of-thought approach where each agent receives not only the original query but also the accumulated responses from previous council members, creating a coherent narrative progression.

Gemini 3's sophisticated instruction-following enables precise persona adherence through carefully crafted system prompts, while its temperature and max_tokens parameters are tuned for creative yet concise fortune-telling responses. The application's multimodal foundation allows seamless integration of voice input via the Web Speech API, with Gemini 3 processing the transcribed text to generate mystical predictions. This architecture showcases Gemini 3's versatility in creative applications, delivering an engaging, personality-driven experience that goes beyond traditional single-response AI interactions.

---


## Features

- **The Council of Fate**: Chain of 4 AI agents providing different perspectives on your fortune
  - 🧙‍♀️ The Fortune Teller - Balanced, realistic predictions
  - ☀️ The Realist - Realisitic view on life
  - 🐱 The Wise Cat - Playful wisdom with a feline twist
- Text input for direct fortune generation
- Voice input with recording, playback, and retake options
- Sequential reveal with typewriter animation
- "Show Full Reading" option to reveal all at once
- Rate limiting (10 requests/minute per IP)
- Minimalist black & white design with agent-specific color accents

## Setup Instructions

### Step 1: OpenRouter Setup

1. Create account at [OpenRouter](https://openrouter.ai)
2. Add credit to your account
3. Generate an API key

### Step 2: Cloudflare Worker Setup

```bash
cd worker
npm install -g wrangler
wrangler login
wrangler kv:namespace create "RATE_LIMIT_KV"
# Copy the ID to wrangler.toml
wrangler secret put OPENROUTER_API_KEY
wrangler deploy
```

### Step 3: GitHub Pages Setup

1. Create GitHub repository
2. Push files: `index.html`, `styles.css`, `app.js`
3. Enable GitHub Pages in repository settings

### Step 4: Configuration

1. Update `WORKER_URL` in `index.html` with your Cloudflare Worker URL
2. Update `ALLOWED_ORIGIN` in `worker/src/index.js` with your GitHub Pages URL


## API Endpoints

- `POST /api/fortune/text` - Direct text to fortune (legacy single response)
- `POST /api/fortune/voice` - Voice transcription to fortune (legacy single response)
- `POST /api/fortune/council` - **NEW**: Chain of 4 agents for multi-perspective fortune


## Troubleshooting Voice Input

### Voice recording not working?

**1. Browser Support Check**
- Voice input requires Chrome, Edge, or Safari
- Firefox has limited support
- Test your setup with `test-microphone.html`

**2. Microphone Permission**
- Click the 🔒 icon in the address bar
- Ensure "Microphone" is set to "Allow"
- If prompted, click "Allow" when browser asks for microphone access

**3. HTTPS Required**
- Voice input only works on HTTPS (not HTTP)
- GitHub Pages provides HTTPS by default

**4. Volume Visualizer Not Showing?**
- Check browser console (F12) for errors
- Ensure microphone is not muted
- Try speaking louder
- Check that microphone is selected in system settings

**5. Common Errors:**
- `not-allowed`: Microphone permission denied
- `audio-capture`: No microphone detected
- `network`: Connection issue with speech API
- `no-speech`: No speech detected (speak louder)

### Debug Steps

1. Open `test-microphone.html` in your browser
2. Click "Test Microphone"
3. Check the debug output
4. Speak and watch the visualizer
5. If successful, the main app should work

## License

MIT
