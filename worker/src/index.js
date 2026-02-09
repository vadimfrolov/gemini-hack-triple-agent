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

// Model configuration
// Note: Transcription is handled by browser's Web Speech API, not an AI model
// Using free model: Gemma 2 27B (Gemma 3 not yet available on OpenRouter)
const MODEL_FORTUNE = 'google/gemma-2-27b-it';

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

      } else {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("Error:", error);

      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': rateLimitCheck.remaining.toString()
        }
      });
    }
  },
};
