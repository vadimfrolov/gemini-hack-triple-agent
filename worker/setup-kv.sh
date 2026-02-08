#!/bin/bash
set -e

echo "Creating KV namespace..."
OUTPUT=$(./node_modules/.bin/wrangler kv:namespace create RATE_LIMIT_KV)
echo "$OUTPUT"

# Extract the ID from the output
ID=$(echo "$OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$ID" ]; then
    echo "Error: Could not find KV namespace ID in output"
    exit 1
fi

echo "KV Namespace ID: $ID"

# Update wrangler.toml
echo "Updating wrangler.toml..."
sed -i.bak "s/your_kv_namespace_id_here/$ID/" wrangler.toml

echo "✅ KV namespace configured with ID: $ID"
echo "Next: Run './node_modules/.bin/wrangler secret put OPENROUTER_API_KEY' to set your API key"
