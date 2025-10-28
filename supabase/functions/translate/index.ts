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
    const { text, sourceLang, targetLang } = await req.json();
    
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

    // BALANCED: Natural translation with speed optimization
    const systemPrompt = `Translate from ${langNames[sourceLang]} to ${langNames[targetLang]}. Provide a natural, idiomatic translation that captures the meaning and tone. Preserve emoticons and formatting.`;

    const needsRom = (lang: string) => ['ja', 'ko', 'zh', 'ru', 'ar', 'th', 'hi'].includes(lang);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `"${text}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "translate",
              description: "Provide natural translation with context",
              parameters: {
                type: "object",
                properties: {
                  translation: { 
                    type: "string", 
                    description: "Natural, fluent translation that sounds native. Adapt idioms and expressions appropriately." 
                  },
                  literal: { 
                    type: "string", 
                    description: "Word-by-word literal translation for learning purposes" 
                  },
                  source_rom: { 
                    type: "string", 
                    description: needsRom(sourceLang) ? "Romanization of source text" : "Empty string" 
                  },
                  target_rom: { 
                    type: "string", 
                    description: needsRom(targetLang) ? "Romanization of target text" : "Empty string" 
                  }
                },
                required: ["translation", "literal", "source_rom", "target_rom"]
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

    return new Response(
      JSON.stringify({ 
        translation,
        literalTranslation,
        sourceRomanization,
        targetRomanization
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
