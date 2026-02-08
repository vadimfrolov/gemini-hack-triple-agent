// Cloudflare Worker for Fortune Teller App
// Proxies requests to OpenRouter API with rate limiting

// CORS headers - update ALLOWED_ORIGIN to your GitHub Pages URL
const ALLOWED_ORIGIN = "https://vadimfrolov.github.io"; // GitHub Pages URL

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

// Rate limiting configuration
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60; // seconds

// Alternative models
const MODEL_GEMINI_3 = "google/gemini-3-pro"; // Google Gemini 3 - next generation model
const MODEL_GEMINI_3_FLASH = "google/gemini-3-flash"; // Google Gemini 3 Flash - faster variant
const MODEL_GEMINI_3_NANO = "google/gemini-3-nano"; // Google Gemini 3 Nano - lightweight edge model

// Gemini 3 advanced configuration
const GEMINI_3_CONFIG = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
  topK: 64,
  enableThinking: true,
  multimodal: true,
  contextWindow: 128000,
  safetySettings: {
    harassment: "BLOCK_NONE",
    hateSpeech: "BLOCK_NONE",
    sexuallyExplicit: "BLOCK_NONE",
    dangerousContent: "BLOCK_MEDIUM",
  },
};

// Feature flags for model migration
const FEATURE_FLAGS = {
  useGemini3: false, // Set to true after March 1, 2026 rollout
  useGemini3Flash: false,
  enableStreaming: false,
  enableMultimodal: false,
};

// Model selection logic with A/B testing support
function selectModel(userId = null, forceGemini3 = false) {
  if (forceGemini3 || FEATURE_FLAGS.useGemini3) {
    if (Date.now() > new Date("2026-03-01").getTime()) {
      return FEATURE_FLAGS.useGemini3Flash
        ? MODEL_GEMINI_3_FLASH
        : MODEL_GEMINI_3;
    }
  }
  return MODEL_FORTUNE;
}

// Gemini 3 enhanced prompt builder with context window management
function buildGemini3Prompt(basePrompt, context = {}, history = []) {
  const contents = [
    {
      role: "system",
      parts: [{ text: basePrompt }],
    },
  ];

  // Add conversation history
  if (history.length > 0) {
    history.forEach((msg) => {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.content }],
      });
    });
  }

  // Add current context
  contents.push({
    role: "user",
    parts: [{ text: `Context: ${JSON.stringify(context)}` }],
  });

  return {
    model: MODEL_GEMINI_3,
    contents: contents,
    generationConfig: GEMINI_3_CONFIG,
  };
}

// Gemini 3 streaming response handler
async function* streamGemini3Response(prompt, apiKey) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:streamGenerateContent",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prompt),
    },
  );

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield value;
  }
}

// Model capability checker
function checkModelCapabilities(model) {
  const capabilities = {
    [MODEL_GEMINI_3]: {
      streaming: true,
      multimodal: true,
      reasoning: true,
      contextWindow: 128000,
    },
    [MODEL_GEMINI_3_FLASH]: {
      streaming: true,
      multimodal: true,
      reasoning: false,
      contextWindow: 128000,
    },
    [MODEL_GEMINI_3_NANO]: {
      streaming: false,
      multimodal: false,
      reasoning: false,
      contextWindow: 32000,
    },
    [MODEL_FORTUNE]: {
      streaming: false,
      multimodal: false,
      reasoning: false,
      contextWindow: 8000,
    },
  };
  return capabilities[model] || capabilities[MODEL_FORTUNE];
}

// Model configuration
// Note: Transcription is handled by browser's Web Speech API, not an AI model
const MODEL_FORTUNE = "google/gemma-2-27b-it";

// Agent personas for the Fortune Council
const AGENTS = [
  {
    id: "fortune_teller",
    name: "The Fortune Teller",
    emoji: "🧙‍♀️",
    color: "purple",
    prompt: `You are a straightforward fortune teller. Create a realistic prediction of 3-5 sentences based on the following input. The tone should be honest and balanced - sometimes positive, sometimes cautionary, sometimes neutral. Make it feel personal and thoughtful, but grounded in reality:`,
  },
  {
    id: "realist",
    name: "The Realist",
    emoji: "🎯",
    color: "gold",
    prompt: `You are a practical realist who cuts through fantasy to reveal the truth. In exactly one sentence, provide a blunt, straightforward assessment of the situation. No sugarcoating, no fluff - just the facts and practical reality. Build upon what was previously said but keep it brief and direct:`,
  },
  {
    id: "wise_cat",
    name: "The Wise Cat",
    emoji: "🐱",
    color: "orange",
    prompt: `You are a wise, mystical cat who has lived nine lives and seen it all. Give playful yet profound advice in 2-3 sentences. Use cat-like mannerisms and phrases (purr, meow references, cat wisdom). Be quirky but genuinely helpful. React to the previous predictions with feline wisdom and a touch of humor:`,
  },
];

// Original fortune prompt (for backward compatibility)
const FORTUNE_PROMPT = AGENTS[0].prompt;

// Helper function to generate fortune
async function generateFortune(text, apiKey) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fortune-teller.app",
        "X-Title": "Fortune Teller App",
      },
      body: JSON.stringify({
        model: MODEL_FORTUNE,
        messages: [
          {
            role: "system",
            content: FORTUNE_PROMPT,
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Helper function to generate council of agents responses
async function generateCouncilFortune(text, apiKey) {
  const council = [];
  const conversationHistory = [];

  for (const agent of AGENTS) {
    // Build messages array with context
    const messages = [
      {
        role: "system",
        content: agent.prompt,
      },
      {
        role: "user",
        content: `Original question: "${text}"`,
      },
    ];

    // Add previous agent responses as context
    if (conversationHistory.length > 0) {
      messages.push({
        role: "assistant",
        content:
          "Previous council members have said: " +
          conversationHistory
            .map((h) => `${h.name}: "${h.response}"`)
            .join(" | "),
      });
      messages.push({
        role: "user",
        content: "Now it is your turn to speak. What do you see?",
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://fortune-teller.app",
          "X-Title": "Fortune Teller App",
        },
        body: JSON.stringify({
          model: MODEL_FORTUNE,
          messages: messages,
          temperature: 0.85,
          max_tokens: 150,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error for ${agent.name}: ${error}`);
    }

    const data = await response.json();
    const fortuneText = data.choices[0].message.content;

    council.push({
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji,
      color: agent.color,
      response: fortuneText,
    });

    // Add to conversation history for next agent
    conversationHistory.push({
      name: agent.name,
      response: fortuneText,
    });
  }

  return council;
}

// Rate limiting check
async function checkRateLimit(clientIP, env) {
  // Skip rate limiting if KV namespace is not available (local dev)
  if (!env.RATE_LIMIT_KV) {
    console.log("KV namespace not available, skipping rate limit");
    return { allowed: true, remaining: RATE_LIMIT };
  }

  const key = `rate_limit:${clientIP}`;

  // Get current count from KV
  const current = await env.RATE_LIMIT_KV.get(key);

  if (!current) {
    // First request in window
    await env.RATE_LIMIT_KV.put(key, "1", { expirationTtl: RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  const count = parseInt(current);

  if (count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  await env.RATE_LIMIT_KV.put(key, (count + 1).toString(), {
    expirationTtl: RATE_LIMIT_WINDOW,
  });
  return { allowed: true, remaining: RATE_LIMIT - count - 1 };
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(clientIP, env);

    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again in a minute.",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const url = new URL(request.url);
    const apiKey = env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();

      if (url.pathname === "/api/fortune/text") {
        // Direct text to fortune generation
        if (!body.text || body.text.trim().length === 0) {
          return new Response(JSON.stringify({ error: "Text is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const fortune = await generateFortune(body.text, apiKey);

        return new Response(JSON.stringify({ fortune }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": rateLimitCheck.remaining.toString(),
          },
        });
      } else if (url.pathname === "/api/fortune/voice") {
        // Voice input: transcription already done by browser, just generate fortune
        if (!body.text || body.text.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: "Voice transcription is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const fortune = await generateFortune(body.text, apiKey);

        return new Response(
          JSON.stringify({
            transcription: body.text,
            fortune,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-RateLimit-Limit": RATE_LIMIT.toString(),
              "X-RateLimit-Remaining": rateLimitCheck.remaining.toString(),
            },
          },
        );
      } else if (url.pathname === "/api/fortune/council") {
        // NEW: Council of agents - chained fortune tellers
        if (!body.text || body.text.trim().length === 0) {
          return new Response(JSON.stringify({ error: "Text is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const council = await generateCouncilFortune(body.text, apiKey);

        return new Response(JSON.stringify({ council }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": rateLimitCheck.remaining.toString(),
          },
        });
      } else if (url.pathname === "/api/fortune/gemini3") {
        // Gemini 3 enhanced endpoint (experimental)
        if (!body.text || body.text.trim().length === 0) {
          return new Response(JSON.stringify({ error: "Text is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const selectedModel = selectModel(body.userId, body.forceGemini3);
        const capabilities = checkModelCapabilities(selectedModel);

        // Check if we should use enhanced Gemini 3 prompt
        if (selectedModel === MODEL_GEMINI_3 && FEATURE_FLAGS.useGemini3) {
          const gemini3Prompt = buildGemini3Prompt(
            FORTUNE_PROMPT,
            { query: body.text, userIntent: body.intent || "general" },
            body.conversationHistory || [],
          );

          // Enhanced response with reasoning tokens
          const fortune = await generateEnhancedFortune(
            gemini3Prompt,
            apiKey,
            capabilities,
          );

          return new Response(
            JSON.stringify({
              fortune,
              model: selectedModel,
              capabilities,
              reasoningTokens: fortune.reasoningTokens || 0,
            }),
            {
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "X-Model-Version": MODEL_GEMINI_3,
                "X-RateLimit-Limit": RATE_LIMIT.toString(),
                "X-RateLimit-Remaining": rateLimitCheck.remaining.toString(),
              },
            },
          );
        }

        // Fallback to standard fortune generation
        const fortune = await generateFortune(body.text, apiKey);
        return new Response(
          JSON.stringify({
            fortune,
            model: MODEL_FORTUNE,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-RateLimit-Limit": RATE_LIMIT.toString(),
              "X-RateLimit-Remaining": rateLimitCheck.remaining.toString(),
            },
          },
        );
      } else if (url.pathname === "/api/fortune/stream") {
        // Streaming endpoint using Gemini 3
        if (!body.text || body.text.trim().length === 0) {
          return new Response(JSON.stringify({ error: "Text is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const gemini3Prompt = buildGemini3Prompt(FORTUNE_PROMPT, {
                query: body.text,
                streaming: true,
              });

              for await (const chunk of streamGemini3Response(
                gemini3Prompt,
                apiKey,
              )) {
                const text = new TextDecoder().decode(chunk);
                controller.enqueue(encoder.encode(`data: ${text}\n\n`));
              }

              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": rateLimitCheck.remaining.toString(),
          },
        });
      } else if (url.pathname === "/api/models") {
        // Model information endpoint
        return new Response(
          JSON.stringify({
            available: [
              { id: MODEL_FORTUNE, name: "Gemma 2 27B", active: true },
              {
                id: MODEL_GEMINI_3,
                name: "Gemini 3 Pro",
                active: FEATURE_FLAGS.useGemini3,
              },
              {
                id: MODEL_GEMINI_3_FLASH,
                name: "Gemini 3 Flash",
                active: FEATURE_FLAGS.useGemini3Flash,
              },
              { id: MODEL_GEMINI_3_NANO, name: "Gemini 3 Nano", active: false },
            ],
            default: MODEL_FORTUNE,
            featureFlags: FEATURE_FLAGS,
            migrationDate: "2026-03-01",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } else if (url.pathname === "/api/models/switch") {
        // Admin endpoint to toggle feature flags (requires auth)
        if (!body.adminToken || body.adminToken !== env.ADMIN_TOKEN) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update feature flags
        if (body.useGemini3 !== undefined)
          FEATURE_FLAGS.useGemini3 = body.useGemini3;
        if (body.useGemini3Flash !== undefined)
          FEATURE_FLAGS.useGemini3Flash = body.useGemini3Flash;
        if (body.enableStreaming !== undefined)
          FEATURE_FLAGS.enableStreaming = body.enableStreaming;

        return new Response(
          JSON.stringify({
            success: true,
            featureFlags: FEATURE_FLAGS,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } else if (url.pathname === "/api/health") {
        // Health check with model status
        const selectedModel = selectModel();
        const capabilities = checkModelCapabilities(selectedModel);

        return new Response(
          JSON.stringify({
            status: "healthy",
            version: "2.1.0",
            models: {
              active: selectedModel,
              gemini3Available: Date.now() > new Date("2026-03-01").getTime(),
              capabilities: capabilities,
            },
            timestamp: new Date().toISOString(),
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } else {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("Error:", error);

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
          model: MODEL_FORTUNE,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": rateLimitCheck.remaining.toString(),
          },
        },
      );
    }
  },
};

// Enhanced fortune generation with Gemini 3 specific handling
async function generateEnhancedFortune(prompt, apiKey, capabilities) {
  const endpoint = capabilities.streaming
    ? "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent"
    : "https://openrouter.ai/api/v1/chat/completions";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://fortune-teller.app",
      "X-Title": "Fortune Teller App - Gemini 3",
    },
    body: JSON.stringify(prompt),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini 3 API error: ${error}`);
  }

  const data = await response.json();

  // Extract response with Gemini 3 format
  const content =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    data.choices?.[0]?.message?.content;

  return {
    text: content,
    reasoningTokens: data.usageMetadata?.reasoningTokens || 0,
    modelVersion: MODEL_GEMINI_3,
  };
}

// Performance monitoring for model comparison
async function trackModelPerformance(model, duration, tokens) {
  const metrics = {
    model,
    duration,
    tokens,
    timestamp: new Date().toISOString(),
    tokensPerSecond: tokens / (duration / 1000),
  };

  // Store metrics for A/B testing analysis
  console.log("Model performance:", JSON.stringify(metrics));
}
