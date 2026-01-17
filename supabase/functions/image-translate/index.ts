import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limits: Vision API is expensive, strict limits
const RATE_LIMIT_AUTHENTICATED = { maxRequests: 20, windowMs: 24 * 60 * 60 * 1000 };  // 20/day
const RATE_LIMIT_ANONYMOUS = { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 };        // 5/day

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authentication
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    // Apply rate limiting - stricter for image translation
    const clientIP = getClientIP(req);
    const identifier = userId ? `user:${userId}` : `ip:${clientIP}`;
    const limits = userId ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_ANONYMOUS;
    
    const rateLimitResult = checkRateLimit({
      identifier: `image:${identifier}`,
      maxRequests: limits.maxRequests,
      windowMs: limits.windowMs,
    });

    if (!rateLimitResult.allowed) {
      console.log(`[RateLimit] Image translate blocked ${identifier}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }
    const { imageBase64, sourceLang, targetLang } = await req.json();

    if (!imageBase64 || !sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image size (max 10MB encoded = ~13.3M characters in base64)
    const MAX_IMAGE_SIZE = 13_000_000;
    if (typeof imageBase64 !== 'string' || imageBase64.length > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Image too large. Maximum size is 10MB" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const langNames: Record<string, string> = {
      ko: "Korean", ja: "Japanese", en: "English", zh: "Chinese",
      es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
      it: "Italian", ru: "Russian", ar: "Arabic", th: "Thai",
      vi: "Vietnamese", id: "Indonesian", hi: "Hindi", tr: "Turkish"
    };

    // Use Lovable AI to extract text and positions from image
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all text from this image and provide the bounding box coordinates (x, y, width, height) for each text region. Translate each text from ${langNames[sourceLang]} to ${langNames[targetLang]}. Return ONLY a JSON array with this exact structure:
[
  {
    "original": "original text",
    "translated": "translated text",
    "x": 0.1,
    "y": 0.2,
    "width": 0.3,
    "height": 0.05
  }
]
The coordinates should be normalized (0-1 range relative to image dimensions). Do not include any markdown formatting or explanation, just the raw JSON array.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Clean up the response - remove markdown code blocks if present
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.slice(7);
    }
    if (content.startsWith('```')) {
      content = content.slice(3);
    }
    if (content.endsWith('```')) {
      content = content.slice(0, -3);
    }
    content = content.trim();

    const textRegions = JSON.parse(content);

    return new Response(
      JSON.stringify({ textRegions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in image-translate:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Translation failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
