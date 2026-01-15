import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { filterContent, filterItems, filterItemsAsync, fullContentCheck } from "./contentFilter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranslationRecord {
  id: string;
  source_text: string;
  target_text: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
  is_favorite: boolean;
}

interface VocabularyRecord {
  id: string;
  word: string;
  language: string;
  definition: any;
  created_at: string;
}

interface GeneratedQuestion {
  question_type: "fill_blank" | "meaning_choice" | "word_order";
  source_type: "recent" | "frequent" | "saved" | "ai_generated";
  source_label: string;
  difficulty_level: string;
  original_translation_id: string | null;
  original_vocabulary_id: string | null;
  question_text: string;
  question_data: {
    options?: string[];
    correct_answer: string;
    words?: string[];
    blank_position?: number;
    original_sentence?: string;
  };
  source_lang: string;
  target_lang: string;
}

const SOURCE_LABELS = {
  recent: "저번에 번역했던 표현",
  frequent: "자주 번역하는 표현",
  saved: "내가 저장한 단어",
  ai_generated: "AI가 내 표현을 바탕으로 만든 문제",
};

const JLPT_DIFFICULTY = {
  N5: { maxSentenceLength: 20, simpleVocab: true },
  N4: { maxSentenceLength: 30, simpleVocab: true },
  N3: { maxSentenceLength: 50, simpleVocab: false },
  N2: { maxSentenceLength: 80, simpleVocab: false },
  N1: { maxSentenceLength: 150, simpleVocab: false },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { questionCount = 5 } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's learning settings
    const { data: settings } = await supabase
      .from("learning_settings")
      .select("jlpt_level")
      .eq("user_id", user.id)
      .single();

    const jlptLevel = settings?.jlpt_level || "N5";
    const difficulty = JLPT_DIFFICULTY[jlptLevel as keyof typeof JLPT_DIFFICULTY];

    // Fetch recent translations (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: rawRecentTranslations } = await supabase
      .from("translations")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch all translations for frequency analysis
    const { data: rawAllTranslations } = await supabase
      .from("translations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    // Fetch saved vocabulary
    const { data: rawSavedVocabulary } = await supabase
      .from("vocabulary")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // ===== CONTENT FILTERING (Step 1: Extraction Stage) =====
    // Filter out inappropriate content before using for learning questions
    console.log("[ContentFilter] Filtering translations and vocabulary for learning content...");
    
    // Filter translations
    const recentTranslations = filterItems<TranslationRecord>(
      rawRecentTranslations || [],
      (t) => [t.source_text, t.target_text],
    );
    
    const allTranslations = filterItems<TranslationRecord>(
      rawAllTranslations || [],
      (t) => [t.source_text, t.target_text],
    );
    
    // Filter vocabulary
    const savedVocabulary = filterItems<VocabularyRecord>(
      rawSavedVocabulary || [],
      (v) => {
        const texts = [v.word];
        if (typeof v.definition === "string") {
          texts.push(v.definition);
        } else if (v.definition?.definitions) {
          texts.push(...v.definition.definitions);
        }
        return texts;
      },
    );
    
    console.log(`[ContentFilter] Filtered: translations ${(rawAllTranslations?.length || 0)} -> ${allTranslations.length}, vocabulary ${(rawSavedVocabulary?.length || 0)} -> ${savedVocabulary.length}`);

    // Analyze frequency
    const frequencyMap = new Map<string, { count: number; translation: TranslationRecord }>();
    (allTranslations || []).forEach((t: TranslationRecord) => {
      const key = t.source_text.toLowerCase().trim();
      const existing = frequencyMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        frequencyMap.set(key, { count: 1, translation: t });
      }
    });

    const frequentTranslations = Array.from(frequencyMap.values())
      .filter(f => f.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(f => f.translation);

    const questions: GeneratedQuestion[] = [];
    const usedSources = new Set<string>();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Helper to add a question with content check (Step 2: Generation Stage - Double safety)
    const addQuestion = async (q: GeneratedQuestion): Promise<boolean> => {
      if (questions.length >= questionCount) return false;
      
      // Double-check content before adding to questions
      const textsToCheck = [q.question_text];
      if (q.question_data.correct_answer) {
        textsToCheck.push(q.question_data.correct_answer);
      }
      if (q.question_data.options) {
        textsToCheck.push(...q.question_data.options);
      }
      
      for (const text of textsToCheck) {
        const result = await fullContentCheck(text, LOVABLE_API_KEY);
        if (result.isBlocked) {
          console.log(`[ContentFilter] Question blocked at generation stage`);
          return false;
        }
      }
      
      questions.push(q);
      return true;
    };

    // 1. Generate from saved vocabulary (highest priority)
    const vocabQuestions = (savedVocabulary || [])
      .filter((v: VocabularyRecord) => !usedSources.has(`vocab_${v.id}`))
      .slice(0, Math.ceil(questionCount * 0.4));

    for (const vocab of vocabQuestions) {
      usedSources.add(`vocab_${vocab.id}`);
      
      // Get definition text
      let definitionText = "";
      if (typeof vocab.definition === "string") {
        definitionText = vocab.definition;
      } else if (vocab.definition?.definitions?.[0]) {
        definitionText = vocab.definition.definitions[0];
      } else if (vocab.definition?.meanings?.[0]?.definition) {
        definitionText = vocab.definition.meanings[0].definition;
      }

      if (!definitionText || definitionText === "번역 문장에서 저장됨") continue;

      // Generate wrong options from other vocabulary
      const wrongOptions = (savedVocabulary || [])
        .filter((v: VocabularyRecord) => v.id !== vocab.id)
        .slice(0, 3)
        .map((v: VocabularyRecord) => {
          if (typeof v.definition === "string") return v.definition;
          if (v.definition?.definitions?.[0]) return v.definition.definitions[0];
          if (v.definition?.meanings?.[0]?.definition) return v.definition.meanings[0].definition;
          return v.word;
        });

      if (wrongOptions.length >= 2) {
        await addQuestion({
          question_type: "meaning_choice",
          source_type: "saved",
          source_label: SOURCE_LABELS.saved,
          difficulty_level: jlptLevel,
          original_translation_id: null,
          original_vocabulary_id: vocab.id,
          question_text: vocab.word,
          question_data: {
            options: [definitionText, ...wrongOptions].sort(() => Math.random() - 0.5),
            correct_answer: definitionText,
          },
          source_lang: vocab.language,
          target_lang: vocab.language === "ja" ? "ko" : "ja",
        });
      }
    }

    // 2. Generate from frequent translations
    const freqQuestions = frequentTranslations
      .filter((t: TranslationRecord) => !usedSources.has(`trans_${t.id}`))
      .filter((t: TranslationRecord) => t.source_text.length <= difficulty.maxSentenceLength)
      .slice(0, Math.ceil(questionCount * 0.3));

    for (const trans of freqQuestions) {
      usedSources.add(`trans_${trans.id}`);

      // Generate wrong options
      const wrongOptions = (allTranslations || [])
        .filter((t: TranslationRecord) => t.id !== trans.id && t.target_lang === trans.target_lang)
        .slice(0, 3)
        .map((t: TranslationRecord) => t.target_text);

      if (wrongOptions.length >= 2) {
        await addQuestion({
          question_type: "meaning_choice",
          source_type: "frequent",
          source_label: SOURCE_LABELS.frequent,
          difficulty_level: jlptLevel,
          original_translation_id: trans.id,
          original_vocabulary_id: null,
          question_text: trans.source_text,
          question_data: {
            options: [trans.target_text, ...wrongOptions].sort(() => Math.random() - 0.5),
            correct_answer: trans.target_text,
          },
          source_lang: trans.source_lang,
          target_lang: trans.target_lang,
        });
      }
    }

    // 3. Generate from recent translations
    const recentQuestions = (recentTranslations || [])
      .filter((t: TranslationRecord) => !usedSources.has(`trans_${t.id}`))
      .filter((t: TranslationRecord) => t.source_text.length <= difficulty.maxSentenceLength)
      .slice(0, Math.ceil(questionCount * 0.3));

    for (const trans of recentQuestions) {
      usedSources.add(`trans_${trans.id}`);

      // Fill-in-the-blank for sentences
      if (trans.target_text.length > 5) {
        const words = trans.target_text.split(/\s+/);
        if (words.length >= 3) {
          const blankPosition = Math.floor(Math.random() * words.length);
          const correctWord = words[blankPosition];
          const displayText = words.map((w: string, i: number) => i === blankPosition ? "___" : w).join(" ");

          const wrongWords = (allTranslations || [])
            .filter((t: TranslationRecord) => t.id !== trans.id)
            .flatMap((t: TranslationRecord) => t.target_text.split(/\s+/))
            .filter(w => w.length >= 2 && w !== correctWord)
            .slice(0, 3);

          if (wrongWords.length >= 2) {
            await addQuestion({
              question_type: "fill_blank",
              source_type: "recent",
              source_label: SOURCE_LABELS.recent,
              difficulty_level: jlptLevel,
              original_translation_id: trans.id,
              original_vocabulary_id: null,
              question_text: displayText,
              question_data: {
                options: [correctWord, ...wrongWords].sort(() => Math.random() - 0.5),
                correct_answer: correctWord,
                original_sentence: trans.target_text,
                blank_position: blankPosition,
              },
              source_lang: trans.source_lang,
              target_lang: trans.target_lang,
            });
            continue;
          }
        }
      }

      // Fallback to meaning choice
      const wrongOptions = (allTranslations || [])
        .filter((t: TranslationRecord) => t.id !== trans.id && t.target_lang === trans.target_lang)
        .slice(0, 3)
        .map((t: TranslationRecord) => t.target_text);

      if (wrongOptions.length >= 2) {
        await addQuestion({
          question_type: "meaning_choice",
          source_type: "recent",
          source_label: SOURCE_LABELS.recent,
          difficulty_level: jlptLevel,
          original_translation_id: trans.id,
          original_vocabulary_id: null,
          question_text: trans.source_text,
          question_data: {
            options: [trans.target_text, ...wrongOptions].sort(() => Math.random() - 0.5),
            correct_answer: trans.target_text,
          },
          source_lang: trans.source_lang,
          target_lang: trans.target_lang,
        });
      }
    }

    // 4. If still need more, use AI to generate from user's patterns
    if (questions.length < questionCount && (allTranslations?.length || 0) > 0) {
      if (LOVABLE_API_KEY) {
        const sampleTranslations = (allTranslations || []).slice(0, 5);
        const prompt = `Based on these translation examples from a user learning Japanese:
${sampleTranslations.map((t: TranslationRecord) => `- "${t.source_text}" → "${t.target_text}"`).join("\n")}

Create ${questionCount - questions.length} similar learning questions at ${jlptLevel} difficulty level.
Each question should be a word or short phrase that the user might want to learn.
IMPORTANT: Do not include any inappropriate, offensive, sexual, or violent content.

Return as JSON array with format:
[{"word": "Japanese word/phrase", "meaning": "Korean meaning", "example": "example sentence in Japanese"}]`;

        try {
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0]?.message?.content || "";
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            
            if (jsonMatch) {
              const aiQuestions = JSON.parse(jsonMatch[0]);
              for (const q of aiQuestions) {
                if (questions.length >= questionCount) break;
                
                // Filter AI-generated content as well
                const aiContentCheck = await fullContentCheck(q.word + " " + q.meaning, LOVABLE_API_KEY);
                if (aiContentCheck.isBlocked) {
                  console.log("[ContentFilter] AI-generated question blocked");
                  continue;
                }
                
                const wrongMeanings = aiQuestions
                  .filter((a: any) => a.word !== q.word)
                  .map((a: any) => a.meaning)
                  .slice(0, 3);

                if (wrongMeanings.length >= 2) {
                  await addQuestion({
                    question_type: "meaning_choice",
                    source_type: "ai_generated",
                    source_label: SOURCE_LABELS.ai_generated,
                    difficulty_level: jlptLevel,
                    original_translation_id: null,
                    original_vocabulary_id: null,
                    question_text: q.word,
                    question_data: {
                      options: [q.meaning, ...wrongMeanings].sort(() => Math.random() - 0.5),
                      correct_answer: q.meaning,
                    },
                    source_lang: "ja",
                    target_lang: "ko",
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error("AI question generation failed:", e);
        }
      }
    }

    // Shuffle questions
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5);

    return new Response(
      JSON.stringify({ questions: shuffledQuestions, jlptLevel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating questions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
