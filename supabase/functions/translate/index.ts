import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";
import { fullContentCheck } from "../_shared/contentFilter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limits: authenticated users get higher limits
const RATE_LIMIT_AUTHENTICATED = { maxRequests: 100, windowMs: 60 * 60 * 1000 }; // 100/hour
const RATE_LIMIT_ANONYMOUS = { maxRequests: 20, windowMs: 60 * 60 * 1000 };      // 20/hour

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
      console.log(`[RateLimit] Blocked ${identifier}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }
    const { text, sourceLang, targetLang, style, requestRecommendation } = await req.json();
    
    // Input validation
    if (!text || !sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate text length
    if (typeof text !== 'string' || text.length < 1) {
      return new Response(
        JSON.stringify({ error: "Text must be at least 1 character" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (text.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Text must be less than 5000 characters" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate language codes
    if (typeof sourceLang !== 'string' || typeof targetLang !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid language codes" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Translation service not configured" }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Content filtering - check for inappropriate content
    const contentCheck = await fullContentCheck(text, LOVABLE_API_KEY, sourceLang);
    if (contentCheck.isBlocked) {
      console.log(`[ContentFilter] Translation blocked: ${contentCheck.category}`);
      return new Response(
        JSON.stringify({ error: "Content blocked due to policy violation" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const langNames: Record<string, string> = {
      ko: "Korean",
      ja: "Japanese",
      en: "English",
      zh: "Chinese (Simplified)",
      es: "Spanish",
      fr: "French",
      de: "German",
      pt: "Portuguese",
      it: "Italian",
      ru: "Russian",
      ar: "Arabic",
      th: "Thai",
      vi: "Vietnamese",
      id: "Indonesian",
      hi: "Hindi",
      tr: "Turkish"
    };

    console.log(`Translation request: ${langNames[sourceLang]} → ${langNames[targetLang]}`);
    
    // If recommendation is requested, analyze the text first
    if (requestRecommendation) {
      const recommendationPrompt = `Analyze this text and recommend the most appropriate translation style preset:

Text: "${text}"
Source language: ${langNames[sourceLang]}

Available presets:
- friend: Informal, casual, natural (for chatting with friends)
- business: Formal, business context, natural (for work emails/documents)
- polite: Formal, casual context, natural (for polite conversation)
- academic: Formal, academic context, literal (for research/papers)

Return ONLY the preset ID (friend/business/polite/academic) that best fits this text's context and purpose.`;

      try {
        const recResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Use fastest model for recommendations
        messages: [
          { role: "user", content: recommendationPrompt }
        ],
        max_completion_tokens: 50, // Limit response size
      }),
        });

        if (recResponse.ok) {
          const recData = await recResponse.json();
          const recommendedPreset = recData.choices[0].message.content.trim().toLowerCase();
          console.log(`AI recommended preset: ${recommendedPreset}`);
          
          return new Response(
            JSON.stringify({ recommendedPreset }),
            { 
              status: 200, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      } catch (error) {
        console.error("Recommendation failed:", error);
      }
    }

    // Build style-aware system prompt
    let styleInstructions = "";
    
    if (style) {
      // Formality
      if (style.formality === "formal") {
        styleInstructions += "\n- Use FORMAL language (존댓말/敬語/formal tone)";
      } else if (style.formality === "informal") {
        styleInstructions += "\n- Use INFORMAL language (반말/タメ口/casual tone)";
      }

      // Domain
      if (style.domain === "business") {
        styleInstructions += "\n- Use BUSINESS terminology and professional expressions";
      } else if (style.domain === "academic") {
        styleInstructions += "\n- Use ACADEMIC terminology and scholarly expressions";
      } else if (style.domain === "casual") {
        styleInstructions += "\n- Use CASUAL everyday expressions";
      }

      // Translation type
      if (style.translationType === "literal") {
        styleInstructions += "\n- Prioritize LITERAL translation (word-for-word accuracy)";
      } else if (style.translationType === "natural") {
        styleInstructions += "\n- Prioritize NATURAL translation (idiomatic fluency)";
      }
    }
    
    // High-context language handling (Korean/Japanese/Chinese)
    const isHighContextLang = ['ko', 'ja', 'zh'].includes(sourceLang);
    const highContextGuidelines = isHighContextLang ? `
HIGH-CONTEXT LANGUAGE RULES:
- Even if subject/object is omitted, ALWAYS output a COMPLETE sentence
- When meaning is ambiguous, choose the most common/natural interpretation
- NEVER stop mid-sentence or output incomplete translations
- Do NOT refuse to translate due to ambiguity - pick the safest general interpretation` : '';

    // FORMALITY LEVEL DETECTION GUIDE
    // Maps source language formality patterns to appropriate target language expressions
    const formalityDetectionGuide = `
FORMALITY LEVEL DETECTION & MAPPING (CRITICAL):
Analyze the source text's formality level and match it appropriately in the target language.

Korean → Japanese formality mapping:
- 반말/casual (해, 야, 뭐해, 미안해, 고마워) → タメ口 (ごめん, ありがとう, 何してる)
- 해요체/polite-casual (미안해요, 고마워요, 뭐해요) → です/ます丁寧 (ごめんなさい, すみません, 何してますか)
- 합쇼체/formal (죄송합니다, 감사합니다) → 敬語 but NATURAL first (すみません > 申し訳ありません)
- 비즈니스/극존칭 → 申し訳ございません (only for clearly business/very formal context)

Korean → English formality mapping:
- 반말 (미안해, 고마워) → casual (sorry, thanks)
- 해요체 (미안해요, 감사해요) → polite (I'm sorry, thank you)
- 합쇼체 (죄송합니다) → formal but natural (I'm sorry, I apologize)

Japanese → Korean formality mapping:
- タメ口 (ごめん, ありがと) → 반말 (미안해, 고마워)
- です/ます (すみません, ありがとうございます) → 해요체/합쇼체 (죄송해요, 감사합니다)
- 敬語 (申し訳ございません) → 극존칭 (대단히 죄송합니다)

CRITICAL EXAMPLES:
- "미안해" → "ごめん" or "ごめんね" (NOT すみません)
- "미안해요" → "ごめんなさい" or "すみません" (NOT 申し訳ありません)  
- "죄송합니다" → "すみません" (default) or "申し訳ありません" (only if clearly business)
- "고마워" → "ありがとう" (NOT ありがとうございます)
- "감사합니다" → "ありがとうございます"

ALWAYS prioritize natural, commonly-used expressions over overly formal ones.
Match the SOURCE text's formality level - don't upgrade or downgrade unnecessarily.`;

    // OPTIMIZED: Focused system prompt for fast core translation only
    // Context cards are now loaded separately via translate-context endpoint
    const systemPrompt = `You are a professional translator. Translate from ${langNames[sourceLang]} to ${langNames[targetLang]}.

${formalityDetectionGuide}

CRITICAL OUTPUT RULES:
1. MAIN TRANSLATION: Match source text's formality level. Use natural, commonly-used expressions.
2. LITERAL TRANSLATION: Output ONLY in ${langNames[targetLang]}. NO source language text.
3. ALWAYS complete sentences - no truncation.
${highContextGuidelines}

TRANSLATION APPROACH:
- Default is NATURAL translation - prioritize fluency and native expression
- Match formality level of source text accurately${styleInstructions}

Output ${langNames[targetLang]} only. Focus on speed and accuracy.`;

    const needsRom = (lang: string) => ['ja', 'ko', 'zh', 'ru', 'ar', 'th', 'hi'].includes(lang);

    // OPTIMIZED: Minimal tool schema for fast core translation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `"${text}"` }
        ],
        temperature: 0.2,
        max_tokens: Math.min(text.length * 3 + 200, 1000), // Reduced for faster response
        tools: [
          {
            type: "function",
            function: {
              name: "translate",
              description: "Provide core translation with romanization",
              parameters: {
                type: "object",
                properties: {
                  translation: { 
                    type: "string", 
                    description: `Main natural translation in ${langNames[targetLang]}` 
                  },
                  literal: { 
                    type: "string", 
                    description: `Literal translation in ${langNames[targetLang]} only` 
                  },
                  source_rom: { 
                    type: "string", 
                    description: needsRom(sourceLang) ? "Romanization of source text" : "Empty string" 
                  },
                  target_rom: { 
                    type: "string", 
                    description: needsRom(targetLang) ? "Romanization of translation" : "Empty string" 
                  },
                  literal_rom: { 
                    type: "string", 
                    description: needsRom(targetLang) ? "Romanization of literal translation" : "Empty string" 
                  }
                },
                required: ["translation", "literal", "source_rom", "target_rom", "literal_rom"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "translate" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          { 
            status: 429, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Translation credits exhausted. Please add credits." }), 
          { 
            status: 402, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Translation failed" }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response");
      return new Response(
        JSON.stringify({ error: "Translation failed" }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const translation = result.translation;
    const literalTranslation = result.literal || "";
    const sourceRomanization = result.source_rom || "";
    const targetRomanization = result.target_rom || "";
    const literalRomanization = result.literal_rom || "";

    // Context cards are now loaded separately via translate-context endpoint
    // Return empty arrays for backwards compatibility
    return new Response(
      JSON.stringify({ 
        translation,
        literalTranslation,
        sourceRomanization,
        targetRomanization,
        literalRomanization,
        alternatives: [],
        usageCards: [],
        example: null
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
