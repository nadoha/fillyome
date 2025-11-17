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
    
    // Korean validation: reject incomplete particles and single characters
    if (lang === 'ko') {
      const incompleteKoreanParticles = ['료', '어', '의', '는', '가', '을', '를', '이', '에', '와', '과', '로', '으로', '도', '만', '부터', '까지'];
      if (incompleteKoreanParticles.includes(word) || word.length < 2) {
        return new Response(
          JSON.stringify({ notFound: true, errorMessage: "완전한 단어를 입력해주세요" }), 
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
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

    const systemPrompt = `You are a precise dictionary. CRITICAL: Only define words that actually exist in ${langNames[lang]}.

If the word does not exist or is nonsensical:
- Set not_found to true
- Set error_message explaining why (e.g., "Not a valid ${langNames[lang]} word", "Gibberish text", "Incomplete word")
- Leave other fields empty

For valid words, provide definitions in ${userLangNames[userLang] || 'English'}:
- pos: part of speech in ${userLangNames[userLang] || 'English'}
- meanings: 2-3 concise definitions (max 12 words each)
- romanization: ${lang === 'ko' ? 'Revised Romanization' : lang === 'ja' ? 'Hepburn romanization' : lang === 'zh' ? 'Pinyin' : 'skip for English'}
- examples: 1-2 SHORT natural sentences (max 12 words each)
- not_found: false

Be strict: if uncertain whether word exists, set not_found=true.`;

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
        model: "google/gemini-2.5-flash-lite",
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
                  not_found: { type: "boolean" },
                  error_message: { type: "string" },
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
                required: ["not_found"],
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
    
    // Check if word was not found
    if (aiResult.not_found) {
      return new Response(JSON.stringify({ 
        notFound: true, 
        errorMessage: aiResult.error_message || "Word not found"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
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
