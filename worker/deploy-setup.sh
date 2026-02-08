#!/bin/bash
# Cloudflare Worker Deployment Setup Script

echo "🚀 Fortune Teller Worker - Cloudflare Setup"
echo "==========================================="
echo ""

# Step 1: Check if logged in
echo "Step 1: Checking Cloudflare login status..."
npx wrangler whoami
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Cloudflare"
    echo "Run: npx wrangler login"
    exit 1
fi
echo "✅ Logged in"
echo ""

# Step 2: Create KV namespace
echo "Step 2: Creating KV namespace for rate limiting..."
echo "Running: npx wrangler kv:namespace create RATE_LIMIT_KV"
KV_OUTPUT=$(npx wrangler kv:namespace create "RATE_LIMIT_KV" 2>&1)
echo "$KV_OUTPUT"

# Extract KV namespace ID from output
KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | grep -o '"[^"]*"' | tr -d '"')

if [ -n "$KV_ID" ]; then
    echo "✅ KV Namespace created with ID: $KV_ID"
    echo ""
    echo "Step 3: Updating wrangler.toml with KV namespace ID..."

    # Update wrangler.toml with the actual KV ID
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/id = \"your_kv_namespace_id_here\"/id = \"$KV_ID\"/" wrangler.toml
    else
        # Linux
        sed -i "s/id = \"your_kv_namespace_id_here\"/id = \"$KV_ID\"/" wrangler.toml
    fi
    echo "✅ wrangler.toml updated"
else
    echo "⚠️  Could not extract KV namespace ID. You may need to update wrangler.toml manually."
fi
echo ""

# Step 4: Set OpenRouter API key
echo "Step 4: Setting OpenRouter API key..."
echo "Please enter your OpenRouter API key:"
npx wrangler secret put OPENROUTER_API_KEY
if [ $? -eq 0 ]; then
    echo "✅ API key configured"
else
    echo "❌ Failed to set API key"
    exit 1
fi
echo ""

# Step 5: Deploy
echo "Step 5: Deploying to Cloudflare..."
npx wrangler deploy
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "Your worker should be available at:"
    echo "https://fortune-teller-worker.<your-subdomain>.workers.dev"
    echo ""
    echo "Next steps:"
    echo "1. Copy the worker URL from the output above"
    echo "2. Update index.html with your worker URL"
    echo "3. Push changes to GitHub to update GitHub Pages"
else
    echo "❌ Deployment failed"
    exit 1
fi
