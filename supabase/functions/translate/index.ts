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

    // CRITICAL: Enforce strict target language adherence and output stability
    const systemPrompt = `You are a professional translator. Translate from ${langNames[sourceLang]} to ${langNames[targetLang]}.

CRITICAL OUTPUT RULES (MUST FOLLOW):
1. MAIN TRANSLATION: For apologies/polite expressions, ALWAYS use the FORMAL/POLITE form first.
   - "죄송합니다" → Main: "申し訳ありません" or "すみません" (NOT ごめんね/ごめんなさい)
   - Casual forms go in alternatives, not main translation
2. LITERAL TRANSLATION: Output ONLY in ${langNames[targetLang]}. NO source language text allowed.
   - "죄송합니다" → literal: "申し訳ございません" (NOT "미안하다 = 申し訳ない")
   - NEVER mix languages in literal field
3. ALWAYS generate usage_cards for expressions with multiple valid translations
4. ALWAYS complete sentences - no truncation

FORMALITY PRIORITY (when no style specified):
- Apologies: 申し訳ありません > すみません > ごめんなさい > ごめん
- Greetings: Polite forms first, casual in alternatives
- Requests: Formal keigo first

TRANSLATION APPROACH:
- Default is NATURAL translation - prioritize fluency and native expression
- Main translation = most universally appropriate (usually polite/formal)
- Alternatives = context-specific variations with tags
${highContextGuidelines}

CRITICAL - ALTERNATIVES & CARDS:
- ALWAYS provide 2-3 alternatives for common expressions
- ALWAYS generate recommend/caution cards for expressions with formality variations
- Example for "죄송합니다":
  alternatives: [{"text":"ごめんなさい","tags":["친구","가족"]},{"text":"すみません","tags":["일반"]},{"text":"失礼しました","tags":["실수","방해"]}]
  usage_cards: [{"type":"recommend","title":"추천","text":"공식적인 상황에서는 申し訳ありません"},{"type":"caution","title":"주의","text":"고객에게 ごめんなさい는 부적절"}]

GUIDELINES:
- Focus on how native speakers actually say it
- Capture meaning and tone naturally
- Do NOT add learning explanations in text${styleInstructions}

Output ${langNames[targetLang]} only.`;

    const needsRom = (lang: string) => ['ja', 'ko', 'zh', 'ru', 'ar', 'th', 'hi'].includes(lang);

    // Optimized AI parameters for faster, more consistent translations
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Fastest model for quick translations
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `"${text}"` }
        ],
        temperature: 0.2, // Lower temperature for more consistent translations
        max_tokens: Math.min(text.length * 4 + 400, 2500), // Dynamic token limit based on input
        tools: [
          {
            type: "function",
            function: {
              name: "translate",
              description: "Provide natural translation with usage context cards (only when needed)",
              parameters: {
                type: "object",
                properties: {
                  translation: { 
                    type: "string", 
                    description: `Main translation - use the MOST POLITE/FORMAL form for apologies, greetings, and requests. Output in ${langNames[targetLang]} only.` 
                  },
                  literal: { 
                    type: "string", 
                    description: `Word-by-word literal translation in ${langNames[targetLang]} ONLY. CRITICAL: No ${langNames[sourceLang]} text allowed. No mixed languages. Only ${langNames[targetLang]} characters.` 
                  },
                  source_rom: { 
                    type: "string", 
                    description: needsRom(sourceLang) ? "Romanization of source text." : "Empty string" 
                  },
                  target_rom: { 
                    type: "string", 
                    description: needsRom(targetLang) ? "Romanization of the natural translation." : "Empty string" 
                  },
                  literal_rom: { 
                    type: "string", 
                    description: needsRom(targetLang) ? "Romanization of the literal translation." : "Empty string" 
                  },
                  alternatives: {
                    type: "array",
                    description: "REQUIRED for polite expressions, apologies, greetings. Provide 2-3 alternatives with different formality levels. Each must have text, tags, and optional note.",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "Alternative translation text in target language" },
                        tags: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "1-2 word context tags: 친구/가족/공식/가게/비즈니스/반말/존댓말/일반 etc."
                        },
                        note: { type: "string", description: "Optional: When to use this (max 10 words)" }
                      },
                      required: ["text", "tags"]
                    }
                  },
                  usage_cards: {
                    type: "array",
                    description: "REQUIRED for expressions with formality variations. MUST include at least one recommend and one caution card for polite expressions.",
                    items: {
                      type: "object",
                      properties: {
                        type: { 
                          type: "string", 
                          enum: ["situation", "tone", "recommend", "caution"],
                          description: "recommend: when to use main translation, caution: what to avoid"
                        },
                        title: { type: "string", description: "Card title: 상황/톤/추천/주의" },
                        items: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "For situation/tone: 1-3 word tags. Empty for recommend/caution."
                        },
                        text: { 
                          type: "string", 
                          description: "For recommend/caution: single line advice (max 15 words). Empty for situation/tone."
                        }
                      },
                      required: ["type", "title"]
                    }
                  },
                  example: {
                    type: "object",
                    description: "Example sentence ONLY if usage context is non-obvious. Null/omit for simple words.",
                    properties: {
                      source: { type: "string", description: "Example in target language" },
                      target: { type: "string", description: "Translation in source language" }
                    }
                  }
                },
                required: ["translation", "literal", "source_rom", "target_rom", "literal_rom", "alternatives", "usage_cards"]
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
    const alternatives = result.alternatives || [];
    const usageCards = result.usage_cards || [];
    const example = result.example || null;

    return new Response(
      JSON.stringify({ 
        translation,
        literalTranslation,
        sourceRomanization,
        targetRomanization,
        literalRomanization,
        alternatives,
        usageCards,
        example
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
