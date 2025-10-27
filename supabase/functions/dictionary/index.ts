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
- pos: part of speech in ${userLangNames[userLang] || 'English'} (noun/verb/adj/etc)
- definitions: array of 1-2 short definitions in ${userLangNames[userLang] || 'English'} (max 10 words each)
- romanization: ${lang === 'ko' ? 'Revised Romanization' : lang === 'ja' ? 'Hepburn romanization' : lang === 'zh' ? 'Pinyin' : 'not needed for English'}
- example: one SHORT example sentence in ${langNames[lang]} using the word (reuse context if provided, max 15 words)

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
                  definitions: { 
                    type: "array",
                    items: { type: "string" },
                    maxItems: 2
                  },
                  romanization: { type: "string" },
                  example: { type: "string" }
                },
                required: ["pos", "definitions", "example"],
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

    const definition = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(definition), {
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
