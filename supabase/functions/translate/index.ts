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
    
    // High-context language handling (Korean/Japanese)
    const isHighContextPair = ['ko', 'ja'].includes(sourceLang) && ['ko', 'ja'].includes(targetLang);
    const highContextGuidelines = isHighContextPair ? `
HIGH-CONTEXT LANGUAGE RULES (Korean/Japanese):
- When the subject is omitted, infer naturally based on the most common conversational context
- Do NOT forcibly specify ambiguous subjects
- Preserve the natural flow and nuance of high-context communication
- Maintain the appropriate level of directness/indirectness` : '';

    // CRITICAL: Enforce strict target language adherence
    const systemPrompt = `You are a professional translator. Translate from ${langNames[sourceLang]} to ${langNames[targetLang]}.

CRITICAL RULES:
- Output MUST be in ${langNames[targetLang]} ONLY
- Prioritize NATURAL, ACTUALLY-USED expressions over literal translation
- Provide ONE main translation that sounds native
- Add 1-2 alternative expressions ONLY when significantly different nuances exist
${highContextGuidelines}

TRANSLATION GUIDELINES:
- Focus on how native speakers actually say it, not textbook translations
- Capture meaning and tone naturally, prioritizing fluency
- Adapt idioms and expressions appropriately for the target culture
- Preserve emoticons and formatting
- Do NOT add learning explanations, levels, or test criteria
- Keep it simple and direct${styleInstructions}

Output ${langNames[targetLang]} only.`;

    const needsRom = (lang: string) => ['ja', 'ko', 'zh', 'ru', 'ar', 'th', 'hi'].includes(lang);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Fast and balanced model
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
                  },
                  example_sentence: {
                    type: "string",
                    description: `A natural example sentence in ${langNames[targetLang]} that demonstrates how the translated word/phrase is used in context. Should be practical and relevant to everyday usage.`
                  }
                },
                required: ["translation", "literal", "source_rom", "target_rom", "example_sentence"]
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
    const exampleSentence = result.example_sentence || "";

    return new Response(
      JSON.stringify({ 
        translation,
        literalTranslation,
        sourceRomanization,
        targetRomanization,
        exampleSentence
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
