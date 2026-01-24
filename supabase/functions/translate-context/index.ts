import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log(`[translate-context] Generating context for: ${sourceText.substring(0, 30)}...`);

    const systemPrompt = `You are a translation context expert. Given a source text and its translation, provide usage context cards.

SOURCE: "${sourceText}" (${langNames[sourceLang]})
TRANSLATION: "${targetText}" (${langNames[targetLang]})

Generate usage context to help learners understand when and how to use this expression.

GUIDELINES:
- alternatives: 2-3 variant translations with context tags (친구/비즈니스/공식/가족 etc.)
- usage_cards: recommend/caution cards for formality, situations
- example: One practical example sentence (only if helpful)

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
          { role: "user", content: "Generate context cards." }
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
                    description: "Alternative translations with context tags",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "Alternative translation" },
                        tags: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "1-2 word context tags"
                        },
                        note: { type: "string", description: "Optional usage note" }
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

    return new Response(
      JSON.stringify({ 
        alternatives,
        usageCards,
        example
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
