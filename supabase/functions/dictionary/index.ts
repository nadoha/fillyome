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
    const { word, lang, context, userLang } = await req.json();
    
    // Input validation
    if (!word || !lang) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: word and lang are required" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate word length
    if (typeof word !== 'string' || word.length < 1) {
      return new Response(
        JSON.stringify({ error: "Word must be at least 1 character" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (word.length > 100) {
      return new Response(
        JSON.stringify({ error: "Word must be less than 100 characters" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate context length if provided
    if (context && typeof context === 'string' && context.length > 500) {
      return new Response(
        JSON.stringify({ error: "Context must be less than 500 characters" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate language codes
    if (typeof lang !== 'string' || (userLang && typeof userLang !== 'string')) {
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
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const langNames: Record<string, string> = {
      ko: 'Korean',
      ja: 'Japanese',
      en: 'English',
      zh: 'Chinese'
    };

    const userLangNames: Record<string, string> = {
      ko: '한국어',
      ja: '日本語',
      en: 'English',
      zh: '中文'
    };

    const systemPrompt = `You are a concise dictionary. Provide definitions in ${userLangNames[userLang] || 'English'}.
Return a JSON object with:
- pos: part of speech in ${userLangNames[userLang] || 'English'} (e.g., 명사, 동사, 형용사, etc.)
- meanings: array of 2-3 short definitions in ${userLangNames[userLang] || 'English'} (max 15 words each)
- romanization: ${lang === 'ko' ? 'Revised Romanization' : lang === 'ja' ? 'Hepburn romanization' : lang === 'zh' ? 'Pinyin' : 'not needed for English'}
- examples: array of 1-2 SHORT example sentences in ${langNames[lang]} using the word (max 15 words each)

Keep everything minimal and concise. All explanations must be in ${userLangNames[userLang] || 'English'}.`;

    const userPrompt = context 
      ? `Define "${word}" (${langNames[lang]}) with definitions in ${userLangNames[userLang] || 'English'} in context: "${context}"`
      : `Define "${word}" (${langNames[lang]}) with definitions in ${userLangNames[userLang] || 'English'}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_definition",
              description: "Provide dictionary definition",
              parameters: {
                type: "object",
                properties: {
                  pos: { type: "string" },
                  meanings: { 
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 3
                  },
                  romanization: { type: "string" },
                  examples: { 
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                    maxItems: 2
                  }
                },
                required: ["pos", "meanings", "examples"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_definition" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const aiResult = JSON.parse(toolCall.function.arguments);
    
    // Transform to match DictionaryResultCard expected structure
    const formattedResult = {
      pronunciation: aiResult.romanization || "",
      definitions: [
        {
          partOfSpeech: aiResult.pos,
          meanings: aiResult.meanings,
          examples: aiResult.examples
        }
      ]
    };

    return new Response(JSON.stringify(formattedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Dictionary error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
