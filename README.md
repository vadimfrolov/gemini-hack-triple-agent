# 🔮 The Grand Fortune Teller's Arcane Apparatus 🔮

_"Any sufficiently advanced API is indistinguishable from magic."_ - Probably some wizard

Behold! A mystical web contraption powered by the ancient arts of Google DeepMind's Gemini 3 sorcery. Constructed from the finest HTML runes, CSS enchantments, JavaScript incantations, and Cloudflare Workers' ethereal mists.

## ✨ Demo

**https://vadimfrolov.github.io/gemini-hack-triple-agent/**

## ⚡ Why This Mystical Contraption Matters ⚡

**🔧 Technical Execution** - *The Craftsmanship of Our Spellwork*
A featherweight frontend under 15 KB crafted with pure vanilla HTML, CSS, and JavaScript - zero frameworks, zero dependencies, just raw wizardry! Built on Cloudflare Workers with proper API architecture, rate limiting, and error handling. **Gemini 3** powers our multi-agent "Council of Fate" system where each AI persona receives context from previous responses, demonstrating advanced prompt chaining. Clean, functional code with voice input via Web Speech API, sequential typewriter animations, and a responsive UI. It actually works, no smoke and mirrors! ✨

**🌍 Potential Impact** - *Why Mortals Might Actually Use This*
Blends ancient mystical traditions with AI to create mindful self-reflection. Multiple perspectives encourage users to pause and contemplate before deciding - transforming fortune-telling into a meditative practice. Perfect foundation for mental wellness apps, decision-making tools, or journaling platforms where magic meets mindfulness. 🔮✨

**💡 Innovation / Wow Factor** - *The "Whoa, That's Actually Cool" Metric*
Instead of one generic AI response, you get a dramatic council of distinct personalities powered by the same model but with different prompt engineering. The sequential reveal with typewriter effects creates narrative tension. Combining mystical aesthetics with cutting-edge AI tech makes technology feel magical again. It's AI as entertainment, not just utility - and that cat agent? Pure genius. 🐱✨


---

## 🌟 Magical Features & Enchantments 🌟

- **The Council of Fate**: A mystical coven of 4 AI spirits, each offering their unique divination:
  - 🧙‍♀️ **The Fortune Teller** - Balanced wisdom, won't sugarcoat but won't terrify you either
  - ☀️ **The Realist** - Cuts through the mystical fog with brutal honesty (someone has to)
  - 🐱 **The Wise Cat** - Dispenses feline philosophy between naps and knocking things over
- 📜 **Text Scrolls** - Type your query with mortal hands
- 🎙️ **Voice Crystals** - Speak your question aloud! Includes recording, playback, and "wait that sounded dumb" retake options
- ⌨️ **Mystical Typewriter Effect** - Watch fortunes materialize letter by letter (very dramatic)
- ⚡ **Impatient Wizard Mode** - "Show Full Reading" for those who can't wait for animations
- 🛡️ **Protection Wards** - Rate limiting (10 fortunes per minute per IP, we're not made of mana!)
- 🎨 **Minimalist Aesthetics** - Black & white sorcery with tasteful colored accents (wizards have style too)

## 📖 The Grand Grimoire of Setup 📖

### Step 1: Acquiring Your OpenRouter Wizard License 🧙

1. Journey to the [OpenRouter](https://openrouter.ai) realm and register your wizard identity
2. Deposit gold coins (credits) into your magical vault
3. Forge an API key (basically your magic wand, don't share it!)

### Step 2: Summoning Your Cloudflare Worker Familiar ☁️

Chant these sacred terminal incantations:

```bash
cd worker
npm install -g wrangler                      # Summon the wrangler tool
wrangler login                                # Prove you're a real wizard
wrangler kv:namespace create "RATE_LIMIT_KV" # Create a magical storage dimension
# Copy the mystical ID to wrangler.toml
wrangler secret put OPENROUTER_API_KEY       # Hide your wand (API key)
wrangler secret put MODEL_FORTUNE            # Set your preferred divination model
wrangler deploy                               # RELEASE THE MAGIC! 🚀
```
Establishing Your GitHub Pages Portal 📚

1. Conjure a GitHub repository (a home for your magical artifacts)
2. Teleport your sacred scrolls: `index.html`, `styles.css`, `app.js`
3. Activate the GitHub Pages dimension in your repository's mystical
2. Push files: `index.html`, `styles.css`, `app.js`
3. Enable GiBinding the Magical Circuits ⚡

1. Inscribe your Cloudflare Worker URL into the `WORKER_URL` rune within `index.html`
2. Carve your GitHub Pages URL into the `ALLOWED_ORIGIN` protection ward in `worker/src/index.js`


## 🗝️ Mystical API Portals 🗝️

- `POST /api/fortune/text` - Ancient single-wizard spell (for nostalgic sorcerers)
- `POST /api/fortune/voice` - Voice-activated solo divination (old but gold)
- `POST /api/fortune/council` - ✨ **THE GRAND COUNCIL** ✨ - Summon all 4 mystics for maximum fortune-telling chaos!

## 📜 The Sacred Scroll of License 📜

MIT (Magical Incantations & Tricks)

*May your fortunes be ever in your favor, and may your API calls never 429.* 🔮✨

---

*P.S. - The Wise Cat accepts tribute in the form of virtual tuna. The other council members have declined to comment.*

---

## License

This project is licensed under the MIT License. This means you are free to use, modify, and distribute this software for any purpose, including commercial applications, provided that the original copyright notice and license terms are included in all copies or substantial portions of the software.

The project is provided "as is", without warranty of any kind. We believe in open source collaboration and encourage you to fork, improve, and share your own versions. Contributions, bug reports, and feature requests are welcome.

By keeping this project open source, we hope to foster learning, experimentation, and innovation in the AI and web development community.
