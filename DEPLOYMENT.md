# Cloudflare Worker Deployment Guide

## ✅ Already Configured

- CORS origin set to: `https://vadimfrolov.github.io`
- Frontend configured to use worker URL (needs to be updated after deployment)

## 🚀 Deployment Steps

### Step 1: Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser window to authenticate with Cloudflare.

### Step 2: Create KV Namespace

```bash
npx wrangler kv:namespace create "RATE_LIMIT_KV"
```

Copy the output, which will look like:

```
{ binding = "RATE_LIMIT_KV", id = "abc123..." }
```

### Step 3: Update wrangler.toml

Replace the `id` in `wrangler.toml` with the ID from Step 2:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "abc123..."  # Replace with your actual ID
```

### Step 4: Add OpenRouter API Key

```bash
npx wrangler secret put OPENROUTER_API_KEY
```

Paste your OpenRouter API key when prompted.

### Step 5: Deploy

```bash
npx wrangler deploy
```

The output will show your worker URL, something like:

```
https://fortune-teller-worker.vadimfrolov.workers.dev
```

### Step 6: Update Frontend

1. Copy the worker URL from the deployment output
2. Update `index.html` line 159 with your worker URL:
   ```javascript
   WORKER_URL: "https://fortune-teller-worker.vadimfrolov.workers.dev";
   ```
3. Commit and push to GitHub:
   ```bash
   git add index.html
   git commit -m "Update worker URL"
   git push
   ```

### Step 7: Test

Visit: https://vadimfrolov.github.io/gemini-hack-triple-agent/

---

## 🔧 Quick Deploy Script

Alternatively, run the automated script:

```bash
cd worker
./deploy-setup.sh
```

## 📝 Environment Variables

- `OPENROUTER_API_KEY`: Your OpenRouter API key (set as Cloudflare secret)
- `RATE_LIMIT_KV`: KV namespace for rate limiting

## 🌐 URLs

- **GitHub Pages**: https://vadimfrolov.github.io/gemini-hack-triple-agent/
- **Worker URL**: (will be assigned after deployment)

## 🐛 Troubleshooting

- If `wrangler` command not found, use `npx wrangler` instead
- Make sure you're in the `worker` directory when running wrangler commands
- Check that your OpenRouter account has credits added
