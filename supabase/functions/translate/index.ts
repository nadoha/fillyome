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
      ja: "Japanese"
    };

    // Step 1: Translate
    const translationPrompt = `You are a professional translator. Translate the given text from ${langNames[sourceLang]} to ${langNames[targetLang]}. 
    
Rules:
- Provide ONLY the translation, no explanations or additional text
- Maintain the original tone and nuance
- Keep proper nouns in their original form unless commonly translated
- Preserve formatting if any`;

    const translationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: translationPrompt },
          { role: "user", content: text }
        ],
      }),
    });

    if (!translationResponse.ok) {
      if (translationResponse.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          { 
            status: 429, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      if (translationResponse.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Translation credits exhausted. Please add credits." }), 
          { 
            status: 402, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      const errorText = await translationResponse.text();
      console.error("AI gateway error:", translationResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Translation failed" }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const translationData = await translationResponse.json();
    const translation = translationData.choices?.[0]?.message?.content;

    if (!translation) {
      console.error("No translation in response");
      return new Response(
        JSON.stringify({ error: "Translation failed" }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Step 2: Generate romanization
    const getRomanization = async (textToRomanize: string, lang: string): Promise<string> => {
      const romanizationSystem = lang === "ja" ? "Hepburn romanization" : "Revised Romanization of Korean";
      const romanizationPrompt = `Convert this ${langNames[lang]} text to ${romanizationSystem}. Respond with ONLY the romanization, no explanations.

Text: "${textToRomanize}"`;

      const romanizationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a romanization expert. Respond with only the romanized text." },
            { role: "user", content: romanizationPrompt }
          ],
        }),
      });

      if (romanizationResponse.ok) {
        const romanizationData = await romanizationResponse.json();
        return romanizationData.choices?.[0]?.message?.content?.trim() || "";
      }
      return "";
    };

    const sourceRomanization = await getRomanization(text, sourceLang);
    const targetRomanization = await getRomanization(translation, targetLang);

    return new Response(
      JSON.stringify({ 
        translation,
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
