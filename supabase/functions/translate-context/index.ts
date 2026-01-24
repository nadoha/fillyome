import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate cache key from source text and languages
function generateCacheKey(sourceText: string, sourceLang: string, targetLang: string): string {
  const normalized = sourceText.trim().toLowerCase().substring(0, 200);
  return `${sourceLang}_${targetLang}_${normalized}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceText, targetText, sourceLang, targetLang } = await req.json();
    
    // Input validation
    if (!sourceText || !targetText || !sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Initialize Supabase client with service role for DB operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate cache key
    const cacheKey = generateCacheKey(sourceText, sourceLang, targetLang);

    // Check DB cache first
    const { data: cachedData, error: cacheError } = await supabase
      .from("context_cards_cache")
      .select("alternatives, usage_cards, usage_example, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (!cacheError && cachedData) {
      // Check if not expired
      const expiresAt = new Date(cachedData.expires_at);
      if (expiresAt > new Date()) {
        console.log(`[translate-context] Cache HIT for: ${sourceText.substring(0, 30)}...`);
        return new Response(
          JSON.stringify({ 
            alternatives: cachedData.alternatives || [],
            usageCards: cachedData.usage_cards || [],
            example: cachedData.usage_example || null,
            fromCache: true
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    console.log(`[translate-context] Cache MISS, generating for: ${sourceText.substring(0, 30)}...`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Service not configured" }), 
        { 
          status: 500, 
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

    const systemPrompt = `You are a translation context expert. Given a source text and its translation, provide usage context cards.

SOURCE: "${sourceText}" (${langNames[sourceLang]})
TRANSLATION: "${targetText}" (${langNames[targetLang]})

Generate usage context to help learners understand when and how to use this expression.

IMPORTANT GUIDELINES:
- alternatives: 2-3 variant translations showing DIFFERENT formality levels
  - Include casual/informal version (친구/タメ口)
  - Include polite version (해요체/です・ます)
  - Include formal version only if relevant (합쇼체/敬語)
- usage_cards: 1-2 recommend/caution cards about formality and situation
- example: One practical example sentence (only if helpful)

For Korean-Japanese translations especially:
- If main translation is formal, show casual alternatives
- If main translation is casual, show polite alternatives
- Explain when each formality level is appropriate

Keep responses concise and practical.`;

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
          { role: "user", content: "Generate context cards with formality alternatives." }
        ],
        temperature: 0.3,
        max_tokens: 800,
        tools: [
          {
            type: "function",
            function: {
              name: "provide_context",
              description: "Provide usage context for a translation",
              parameters: {
                type: "object",
                properties: {
                  alternatives: {
                    type: "array",
                    description: "Alternative translations with formality tags",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "Alternative translation" },
                        tags: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "Formality/context tags (친구/반말, 해요체, 존댓말, タメ口, 敬語, casual, formal, etc.)"
                        },
                        note: { type: "string", description: "Brief usage note" }
                      },
                      required: ["text", "tags"]
                    }
                  },
                  usage_cards: {
                    type: "array",
                    description: "Usage guidance cards",
                    items: {
                      type: "object",
                      properties: {
                        type: { 
                          type: "string", 
                          enum: ["situation", "tone", "recommend", "caution"]
                        },
                        title: { type: "string" },
                        items: { type: "array", items: { type: "string" } },
                        text: { type: "string" }
                      },
                      required: ["type", "title"]
                    }
                  },
                  example: {
                    type: "object",
                    description: "Example sentence pair",
                    properties: {
                      source: { type: "string", description: "Example in target language" },
                      target: { type: "string", description: "Translation in source language" }
                    }
                  }
                },
                required: ["alternatives", "usage_cards"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_context" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[translate-context] AI error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          alternatives: [], 
          usageCards: [], 
          example: null 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.log("[translate-context] No tool call, returning empty");
      return new Response(
        JSON.stringify({ 
          alternatives: [], 
          usageCards: [], 
          example: null 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const alternatives = result.alternatives || [];
    const usageCards = (result.usage_cards || []).filter(
      (card: any) => ["situation", "tone", "recommend", "caution"].includes(card.type)
    );
    const example = result.example || null;

    console.log(`[translate-context] Generated ${alternatives.length} alternatives, ${usageCards.length} cards`);

    // Save to DB cache (upsert)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days TTL

    const { error: upsertError } = await supabase
      .from("context_cards_cache")
      .upsert({
        cache_key: cacheKey,
        source_text: sourceText.substring(0, 500), // Limit stored text
        target_text: targetText.substring(0, 500),
        source_lang: sourceLang,
        target_lang: targetLang,
        alternatives: alternatives,
        usage_cards: usageCards,
        usage_example: example,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'cache_key'
      });

    if (upsertError) {
      console.error("[translate-context] Cache save error:", upsertError);
    } else {
      console.log("[translate-context] Saved to cache");
    }

    return new Response(
      JSON.stringify({ 
        alternatives,
        usageCards,
        example,
        fromCache: false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[translate-context] Error:", error);
    return new Response(
      JSON.stringify({ 
        alternatives: [], 
        usageCards: [], 
        example: null 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});