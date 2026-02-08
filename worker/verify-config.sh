#!/bin/bash

echo "🔍 Verifying Fortune Teller Configuration"
echo "=========================================="
echo ""

echo "1. Checking wrangler.toml configuration..."
grep "id =" wrangler.toml
echo ""

echo "2. Testing worker endpoint..."
echo "Testing: https://fortune-teller-worker.vadimfrolovde.workers.dev/api/fortune/council"
curl -X POST https://fortune-teller-worker.vadimfrolovde.workers.dev/api/fortune/council \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://vadimfrolov.github.io' \
  -d '{"text": "test"}' \
  -s -w "\nHTTP Status: %{http_code}\n"
echo ""

echo "3. Checking GitHub Pages configuration..."
echo "Fetching: https://vadimfrolov.github.io/gemini-hack-triple-agent/"
curl -s "https://vadimfrolov.github.io/gemini-hack-triple-agent/" | grep -A 2 "WORKER_URL"
echo ""

echo "=========================================="
echo "✅ Verification complete"
