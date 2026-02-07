# Fortune Teller Web App

A minimalist web application that uses OpenRouter AI to generate mystical fortune predictions. Built with HTML, CSS, JavaScript, and Cloudflare Workers.

## Architecture

```
GitHub Pages (Frontend) → Cloudflare Worker (Proxy) → OpenRouter API
```

## Features

- Text input for direct fortune generation
- Voice input with recording, playback, and retake options
- Rate limiting (10 requests/minute per IP)
- Minimalist black & white design

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

## File Structure

```
├── index.html              # Frontend HTML
├── styles.css              # Black & white styles
├── app.js                  # Frontend JavaScript
└── worker/
    ├── src/
    │   └── index.js        # Cloudflare Worker
    ├── wrangler.toml       # Worker config
    └── package.json        # Worker dependencies
```

## API Endpoints

- `POST /api/fortune/text` - Direct text to fortune
- `POST /api/fortune/voice` - Voice transcription to fortune

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