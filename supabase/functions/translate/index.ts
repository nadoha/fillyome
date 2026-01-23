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

// Forced response schema for consistent output
interface TranslationSchema {
  main_translation: string;
  main_romaji: string | null;
  core_meaning_kr: string;
  usage: {
    ok_for: string[];
    avoid_when: string[];
  };
  safer_alternative: {
    text: string | null;
    romaji: string | null;
    reason: string | null;
  };
  alternatives: Array<{
    text: string;
    romaji: string | null;
    situations: string[];
  }>;
  example: {
    jp: string | null;
    jp_romaji: string | null;
    kr: string | null;
  };
  literal_translation: string;
  literal_romaji: string | null;
  source_romaji: string | null;
}

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
    const { text, sourceLang, targetLang, style } = await req.json();
    
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

    // Build style-aware instructions
    let styleInstructions = "";
    if (style) {
      if (style.formality === "formal") {
        styleInstructions += "\n- Use FORMAL language (존댓말/敬語/formal tone)";
      } else if (style.formality === "informal") {
        styleInstructions += "\n- Use INFORMAL language (반말/タメ口/casual tone)";
      }
      if (style.domain === "business") {
        styleInstructions += "\n- Use BUSINESS terminology and professional expressions";
      } else if (style.domain === "academic") {
        styleInstructions += "\n- Use ACADEMIC terminology and scholarly expressions";
      }
    }

    const needsRom = (lang: string) => ['ja', 'ko', 'zh', 'ru', 'ar', 'th', 'hi'].includes(lang);
    const sourceNeedsRom = needsRom(sourceLang);
    const targetNeedsRom = needsRom(targetLang);

    // Forced JSON schema prompt
    const systemPrompt = `You are a professional translator. Translate from ${langNames[sourceLang]} to ${langNames[targetLang]}.

Return ONLY valid JSON matching the schema below. No markdown. No extra text. No code blocks.
If you are unsure about any field, still fill it with your best guess. NEVER omit any keys.

SCHEMA:
{
  "main_translation": "Natural translation in ${langNames[targetLang]}",
  "main_romaji": ${targetNeedsRom ? '"Romanization of main_translation"' : 'null'},
  "core_meaning_kr": "Original meaning in Korean (for context display)",
  "usage": {
    "ok_for": ["1-2 word contexts where this expression is appropriate, e.g. 친구, 가족, 캐주얼"],
    "avoid_when": ["1-2 word contexts to avoid, e.g. 비즈니스, 격식, 가게"]
  },
  "safer_alternative": {
    "text": "A more formal/safer alternative expression if the main translation has usage restrictions, or null",
    "romaji": ${targetNeedsRom ? '"Romanization of safer alternative"' : 'null'},
    "reason": "Max 10 words: when to use this instead, or null"
  },
  "alternatives": [
    {
      "text": "Alternative expression with different nuance/formality",
      "romaji": ${targetNeedsRom ? '"Romanization"' : 'null'},
      "situations": ["1-2 word situations where this is best, e.g. 일반, 비즈니스"]
    }
  ],
  "example": {
    "jp": "One example sentence in ${langNames[targetLang]} using the main_translation expression",
    "jp_romaji": ${targetNeedsRom ? '"Romanization of the example sentence"' : 'null'},
    "kr": "Korean translation of the example"
  },
  "literal_translation": "Word-by-word literal translation in ${langNames[targetLang]}",
  "literal_romaji": ${targetNeedsRom ? '"Romanization of literal translation"' : 'null'},
  "source_romaji": ${sourceNeedsRom ? '"Romanization of source text"' : 'null'}
}

CRITICAL RULES:
- Output ONLY the JSON object, nothing else
- All keys must be present (use null or [] for empty values)
- usage.ok_for and usage.avoid_when must ALWAYS have at least 1 item each for phrases/sentences
- For simple words without context sensitivity, ok_for can have ["일반"], avoid_when can have []
- **ALTERNATIVES ARE MANDATORY** for these categories:
  * Apology expressions (사과): 죄송합니다, 미안합니다 → Return 2-3 alternatives (ごめんなさい, すみません, 申し訳ありません, etc.)
  * Greeting expressions (인사): 안녕하세요, 감사합니다 → Return 2-3 alternatives
  * Polite requests (요청): ~해주세요, ~해도 될까요 → Return 2-3 alternatives
- Each alternative MUST have text, romaji (if target needs romanization), and situations (1-2 word contexts)
- For simple/direct translations without multiple valid options, alternatives can be empty []
- main_translation must be a COMPLETE, natural sentence
- example.jp and example.jp_romaji MUST always be provided for phrases/sentences
${styleInstructions}`;

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
          { role: "user", content: `Translate: "${text}"` }
        ],
        temperature: 0.2,
        max_tokens: Math.min(text.length * 6 + 800, 3000),
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Translation credits exhausted. Please add credits." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Translation failed" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    
    // Log raw response for debugging
    console.log("[Translate] Raw LLM response:", rawContent.substring(0, 500));

    // Parse JSON from response (handle potential markdown code blocks)
    let parsed: TranslationSchema;
    try {
      // Remove markdown code fences if present
      let jsonStr = rawContent.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();
      
      parsed = JSON.parse(jsonStr);
      console.log("[Translate] Parsed JSON keys:", Object.keys(parsed));
    } catch (parseError) {
      console.error("[Translate] JSON parse failed:", parseError);
      console.error("[Translate] Raw content was:", rawContent);
      
      // Fallback: return basic translation from raw content
      return new Response(
        JSON.stringify({
          translation: rawContent.substring(0, 200),
          literalTranslation: "",
          sourceRomanization: "",
          targetRomanization: "",
          literalRomanization: "",
          usageJudgment: { ok_for: ["일반"], avoid_when: [] },
          saferAlternative: null,
          alternatives: [],
          example: null,
          _parseError: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure all required fields have defaults
    const result: TranslationSchema = {
      main_translation: parsed.main_translation || text,
      main_romaji: parsed.main_romaji || null,
      core_meaning_kr: parsed.core_meaning_kr || text,
      usage: {
        ok_for: parsed.usage?.ok_for || ["일반"],
        avoid_when: parsed.usage?.avoid_when || []
      },
      safer_alternative: {
        text: parsed.safer_alternative?.text || null,
        romaji: parsed.safer_alternative?.romaji || null,
        reason: parsed.safer_alternative?.reason || null
      },
      alternatives: (parsed.alternatives || []).map((alt: any) => ({
        text: alt.text || "",
        romaji: alt.romaji || null,
        situations: alt.situations || []
      })),
      example: {
        jp: parsed.example?.jp || null,
        jp_romaji: parsed.example?.jp_romaji || null,
        kr: parsed.example?.kr || null
      },
      literal_translation: parsed.literal_translation || parsed.main_translation || text,
      literal_romaji: parsed.literal_romaji || null,
      source_romaji: parsed.source_romaji || null
    };

    console.log("[Translate] Final result - usage:", JSON.stringify(result.usage));
    console.log("[Translate] Final result - safer_alternative:", JSON.stringify(result.safer_alternative));
    console.log("[Translate] Final result - alternatives:", JSON.stringify(result.alternatives));

    // Map to frontend expected format
    return new Response(
      JSON.stringify({ 
        translation: result.main_translation,
        literalTranslation: result.literal_translation,
        sourceRomanization: result.source_romaji || "",
        targetRomanization: result.main_romaji || "",
        literalRomanization: result.literal_romaji || "",
        usageJudgment: result.usage,
        saferAlternative: result.safer_alternative.text ? result.safer_alternative : null,
        alternatives: result.alternatives.length > 0 ? result.alternatives : null,
        example: (result.example.jp || result.example.kr) ? result.example : null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
