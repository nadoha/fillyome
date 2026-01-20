import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limits for batch translation
const RATE_LIMIT_AUTHENTICATED = { maxRequests: 50, windowMs: 60 * 60 * 1000 }; // 50/hour
const RATE_LIMIT_ANONYMOUS = { maxRequests: 10, windowMs: 60 * 60 * 1000 };      // 10/hour

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
    const identifier = userId ? `batch:user:${userId}` : `batch:ip:${clientIP}`;
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

    const { texts, sourceLang, targetLang, style } = await req.json();
    
    // Input validation
    if (!texts || !Array.isArray(texts) || texts.length === 0 || !sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit batch size
    if (texts.length > 10) {
      return new Response(
        JSON.stringify({ error: "Batch size exceeds limit (max 10)" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Translation service not configured" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const langNames: Record<string, string> = {
      ko: "Korean", ja: "Japanese", en: "English", zh: "Chinese (Simplified)",
      es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
      it: "Italian", ru: "Russian", ar: "Arabic", th: "Thai",
      vi: "Vietnamese", id: "Indonesian", hi: "Hindi", tr: "Turkish"
    };

    // Build style instructions
    let styleInstructions = "";
    if (style) {
      if (style.formality === "formal") {
        styleInstructions += "\n- Use FORMAL language";
      } else if (style.formality === "informal") {
        styleInstructions += "\n- Use INFORMAL language";
      }
      if (style.translationType === "literal") {
        styleInstructions += "\n- Prioritize LITERAL translation";
      } else if (style.translationType === "natural") {
        styleInstructions += "\n- Prioritize NATURAL translation";
      }
    }

    const systemPrompt = `You are a professional translator. Translate from ${langNames[sourceLang]} to ${langNames[targetLang]}.
Output MUST be in ${langNames[targetLang]} ONLY.${styleInstructions}`;

    const needsRom = (lang: string) => ['ja', 'ko', 'zh', 'ru', 'ar', 'th', 'hi'].includes(lang);

    // Parallel translation of all texts
    const translationPromises = texts.map(async (text: string) => {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite", // Fastest model for batch
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `"${text}"` }
            ],
            temperature: 0.2,
            max_tokens: Math.min(text.length * 3 + 100, 1000),
            tools: [
              {
                type: "function",
                function: {
                  name: "translate",
                  description: "Provide translation",
                  parameters: {
                    type: "object",
                    properties: {
                      translation: { type: "string", description: "Natural translation" },
                      literal: { type: "string", description: "Literal translation" },
                      source_rom: { type: "string", description: needsRom(sourceLang) ? "Source romanization" : "" },
                      target_rom: { type: "string", description: needsRom(targetLang) ? "Target romanization" : "" }
                    },
                    required: ["translation"]
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "translate" } }
          }),
        });

        if (!response.ok) {
          console.error(`Batch item failed: ${response.status}`);
          return { translation: "", error: true };
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        
        if (!toolCall?.function?.arguments) {
          return { translation: "", error: true };
        }

        const result = JSON.parse(toolCall.function.arguments);
        return {
          translation: result.translation || "",
          literalTranslation: result.literal || "",
          sourceRomanization: result.source_rom || "",
          targetRomanization: result.target_rom || ""
        };
      } catch (error) {
        console.error("Batch translation error:", error);
        return { translation: "", error: true };
      }
    });

    const translations = await Promise.all(translationPromises);

    return new Response(
      JSON.stringify({ translations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Batch translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
