// Cloudflare Worker for Fortune Teller App
// Proxies requests to OpenRouter API with rate limiting

// CORS headers - update ALLOWED_ORIGIN to your GitHub Pages URL
const ALLOWED_ORIGIN = '*'; // Change this to your GitHub Pages URL in production

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// Rate limiting configuration
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60; // seconds

// Model configuration
// Note: Transcription is handled by browser's Web Speech API, not an AI model
const MODEL_FORTUNE = 'anthropic/claude-3.5-sonnet';

// Fortune teller prompt
const FORTUNE_PROMPT = `Imagine you are a mystical fortune teller. Create a short, engaging prediction of 3-7 sentences based on the following input. The tone should be mysterious yet positive, incorporating elements of the input naturally. Make it feel personal and magical:`;

// Helper function to generate fortune
async function generateFortune(text, apiKey) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://fortune-teller.app',
      'X-Title': 'Fortune Teller App'
    },
    body: JSON.stringify({
      model: MODEL_FORTUNE,
      messages: [
        {
          role: 'system',
          content: FORTUNE_PROMPT
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.8,
      max_tokens: 200
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Rate limiting check
async function checkRateLimit(clientIP, env) {
  const key = `rate_limit:${clientIP}`;
  
  // Get current count from KV
  const current = await env.RATE_LIMIT_KV.get(key);
  
  if (!current) {
    // First request in window
    await env.RATE_LIMIT_KV.put(key, '1', { expirationTtl: RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  
  const count = parseInt(current);
  
  if (count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  
  // Increment count
  await env.RATE_LIMIT_KV.put(key, (count + 1).toString(), { expirationTtl: RATE_LIMIT_WINDOW });
  return { allowed: true, remaining: RATE_LIMIT - count - 1 };
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(clientIP, env);
    
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again in a minute.' 
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': '0'
        }
      });
    }

    const url = new URL(request.url);
    const apiKey = env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();

      if (url.pathname === '/api/fortune/text') {
        // Direct text to fortune generation
        if (!body.text || body.text.trim().length === 0) {
          return new Response(JSON.stringify({ error: 'Text is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const fortune = await generateFortune(body.text, apiKey);
        
        return new Response(JSON.stringify({ fortune }), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': rateLimitCheck.remaining.toString()
          }
        });

      } else if (url.pathname === '/api/fortune/voice') {
        // Voice input: transcription already done by browser, just generate fortune
        if (!body.text || body.text.trim().length === 0) {
          return new Response(JSON.stringify({ error: 'Voice transcription is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const fortune = await generateFortune(body.text, apiKey);
        
        return new Response(JSON.stringify({ 
          transcription: body.text,
          fortune 
        }), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': rateLimitCheck.remaining.toString()
          }
        });

      } else {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } catch (error) {
      console.error('Error:', error);
      
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
  }
};