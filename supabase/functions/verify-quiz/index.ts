import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { question, options, correctAnswer, sourceLang, targetLang } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Verifying quiz question:', { question, options, correctAnswer, sourceLang, targetLang });

    const systemPrompt = `You are a language expert who verifies translation quiz questions. 
Your job is to check if:
1. The question word is spelled correctly
2. The correct answer is an accurate translation
3. The wrong answer options make sense (are plausible but incorrect translations)
4. There are no typos or errors

Respond in JSON format with:
{
  "isValid": boolean,
  "issues": string[] (list of problems found, empty if valid),
  "suggestion": string (suggested fix if there are issues, null if valid),
  "confidence": number (0-100, how confident you are about this verification)
}

Be strict about accuracy but fair about minor variations in translation.`;

    const userPrompt = `Please verify this translation quiz question:

Source Language: ${sourceLang}
Target Language: ${targetLang}
Question Word: "${question}"
Correct Answer: "${correctAnswer}"
All Options: ${JSON.stringify(options)}

Check for typos, incorrect translations, or any issues with this question.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    console.log('AI response:', content);

    // Parse JSON from response
    let verification;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      verification = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      verification = {
        isValid: true,
        issues: [],
        suggestion: null,
        confidence: 50,
        rawResponse: content
      };
    }

    return new Response(JSON.stringify(verification), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-quiz function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
