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
    
    if (!text || !sourceLang || !targetLang) {
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
      zh: "Chinese (Simplified)"
    };

    // OPTIMIZED: Single AI call with structured output using tool calling
    const systemPrompt = `You are a professional translator. Translate text from ${langNames[sourceLang]} to ${langNames[targetLang]} and provide comprehensive translation data.`;

    const getRomanizationInstruction = (lang: string) => {
      if (lang === "ja") return "Hepburn romanization";
      if (lang === "ko") return "Revised Romanization of Korean";
      if (lang === "zh") return "Pinyin";
      return "no romanization needed for English";
    };

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
          { 
            role: "user", 
            content: `Translate the following ${langNames[sourceLang]} text to ${langNames[targetLang]}:

"${text}"

Provide:
1. Natural/idiomatic translation (의역) - Use natural expressions, adapt cultural context, preserve emoticons (ㅜㅜ, ^^, etc.), understand emotional tone, translate based on overall meaning
2. Literal translation (직역) - Word-by-word, keep original structure even if unnatural
3. Source romanization - Use ${getRomanizationInstruction(sourceLang)}
4. Target romanization - Use ${getRomanizationInstruction(targetLang)}` 
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_translation",
              description: "Provide comprehensive translation data",
              parameters: {
                type: "object",
                properties: {
                  natural_translation: {
                    type: "string",
                    description: "Natural, idiomatic translation with cultural adaptation"
                  },
                  literal_translation: {
                    type: "string",
                    description: "Word-by-word literal translation"
                  },
                  source_romanization: {
                    type: "string",
                    description: "Romanization of source text"
                  },
                  target_romanization: {
                    type: "string",
                    description: "Romanization of translated text"
                  }
                },
                required: ["natural_translation", "literal_translation", "source_romanization", "target_romanization"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_translation" } }
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

    const translationData = JSON.parse(toolCall.function.arguments);
    const translation = translationData.natural_translation;
    const literalTranslation = translationData.literal_translation || "";
    const sourceRomanization = translationData.source_romanization || "";
    const targetRomanization = translationData.target_romanization || "";

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
