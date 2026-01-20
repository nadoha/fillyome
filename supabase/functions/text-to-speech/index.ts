import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";
import { fullContentCheck } from "../_shared/contentFilter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limits: TTS is expensive, lower limits
const RATE_LIMIT_AUTHENTICATED = { maxRequests: 50, windowMs: 60 * 60 * 1000 };  // 50/hour
const RATE_LIMIT_ANONYMOUS = { maxRequests: 10, windowMs: 60 * 60 * 1000 };       // 10/hour

// ElevenLabs multilingual voice IDs - optimized for different languages
const ELEVENLABS_VOICES: Record<string, string> = {
  'default': 'pNInz6obpgDQGcFmaJgB',  // Adam - multilingual
  'ja': 'pNInz6obpgDQGcFmaJgB',        // Adam - excellent for Japanese
  'ko': 'pNInz6obpgDQGcFmaJgB',        // Adam - good for Korean
  'zh': 'pNInz6obpgDQGcFmaJgB',        // Adam - good for Chinese
  'en': 'pNInz6obpgDQGcFmaJgB',        // Adam - English
  'es': 'pNInz6obpgDQGcFmaJgB',        // Adam - Spanish
  'fr': 'pNInz6obpgDQGcFmaJgB',        // Adam - French
  'de': 'pNInz6obpgDQGcFmaJgB',        // Adam - German
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // Apply rate limiting
    const clientIP = getClientIP(req);
    const identifier = userId ? `user:${userId}` : `ip:${clientIP}`;
    const limits = userId ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_ANONYMOUS;
    
    const rateLimitResult = checkRateLimit({
      identifier,
      maxRequests: limits.maxRequests,
      windowMs: limits.windowMs,
    });

    if (!rateLimitResult.allowed) {
      console.log(`[RateLimit] TTS blocked ${identifier}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }
    const { text, lang, speed = 1.0 } = await req.json();

    // Input validation
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedText = text.trim();
    
    // Length validation (1-4096 characters, typical TTS limit)
    if (trimmedText.length < 1) {
      return new Response(
        JSON.stringify({ error: 'Text cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (trimmedText.length > 4096) {
      return new Response(
        JSON.stringify({ error: 'Text exceeds maximum length of 4096 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Speed validation (ElevenLabs doesn't directly support speed, but we can adjust stability)
    const validSpeed = Math.min(2.0, Math.max(0.5, Number(speed) || 1.0));

    // Content filtering - check for inappropriate content
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      const contentCheck = await fullContentCheck(trimmedText, LOVABLE_API_KEY, lang);
      if (contentCheck.isBlocked) {
        console.log(`[ContentFilter] TTS blocked: ${contentCheck.category}`);
        return new Response(
          JSON.stringify({ error: "Content blocked due to policy violation" }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    // Try ElevenLabs first (primary)
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (ELEVENLABS_API_KEY) {
      try {
        const voiceId = ELEVENLABS_VOICES[lang] || ELEVENLABS_VOICES['default'];
        
        // ElevenLabs Turbo v2.5 model for fast, multilingual TTS
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: trimmedText,
              model_id: 'eleven_turbo_v2_5', // Multilingual turbo model
              voice_settings: {
                stability: validSpeed > 1 ? 0.4 : 0.5, // Slightly less stable for faster speech
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
          
          console.log(`[ElevenLabs] TTS success for lang: ${lang}, length: ${trimmedText.length}`);
          
          return new Response(
            JSON.stringify({ audioContent: base64Audio }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        } else {
          const errorText = await response.text();
          console.error(`[ElevenLabs] TTS failed: ${response.status} - ${errorText}`);
          // Fall through to other options
        }
      } catch (elevenLabsError) {
        console.error('[ElevenLabs] TTS error:', elevenLabsError);
        // Fall through to other options
      }
    }

    // Fallback to OpenAI if available
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (OPENAI_API_KEY) {
      // Map language codes to appropriate OpenAI voices
      const voiceMap: Record<string, string> = {
        'en': 'alloy',
        'ja': 'shimmer',
        'ko': 'nova',
        'zh': 'shimmer',
        'es': 'nova',
        'fr': 'alloy',
        'de': 'echo',
        'it': 'nova',
        'pt': 'alloy',
        'ru': 'echo',
      };

      const voice = voiceMap[lang] || 'alloy';

      console.log(`[OpenAI] Generating speech for text (${trimmedText.length} chars) with voice: ${voice}, speed: ${validSpeed}`);

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: trimmedText,
          voice: voice,
          response_format: 'mp3',
          speed: validSpeed,
        }),
      });

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

        return new Response(
          JSON.stringify({ audioContent: base64Audio }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } else {
        const error = await response.json();
        console.error('[OpenAI] TTS failed:', error);
      }
    }

    // No TTS service available
    return new Response(
      JSON.stringify({ error: 'TTS service unavailable', useBrowserFallback: true }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
    
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', useBrowserFallback: true }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
