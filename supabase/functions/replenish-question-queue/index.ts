import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { filterContent, filterItems, fullContentCheck } from "./contentFilter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_QUEUE_SIZE = 10;

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

interface QuizResultRecord {
  id: string;
  vocabulary_id: string | null;
  was_correct: boolean;
  response_time_seconds: number | null;
  created_at: string;
  quiz_type: string;
}

interface LearningQuestionRecord {
  id: string;
  question_text: string;
  source_type: string;
  was_answered: boolean;
  was_correct: boolean | null;
  created_at: string;
  original_translation_id: string | null;
  original_vocabulary_id: string | null;
}

type SourceType = 
  | "recent" 
  | "frequent" 
  | "saved" 
  | "ai_generated"
  | "unpracticed"
  | "past_mistake"
  | "trending"
  | "ai_recommended"
  | "review_needed";

interface GeneratedQuestion {
  question_type: "fill_blank" | "meaning_choice" | "word_order";
  source_type: SourceType;
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

const SOURCE_LABELS: Record<SourceType, string> = {
  recent: "저번에 번역했던 표현",
  frequent: "자주 번역하는 표현",
  saved: "내가 저장한 단어",
  ai_generated: "AI가 내 표현을 바탕으로 만든 문제",
  unpracticed: "자주 쓰지만 아직 연습 안 한 표현",
  past_mistake: "예전에 헷갈렸던 표현",
  trending: "요즘 많이 쓰는 표현 기반",
  ai_recommended: "AI가 사용 패턴을 보고 추천",
  review_needed: "오래 안 다룬 표현",
};

const JLPT_DIFFICULTY = {
  N5: { maxSentenceLength: 20 },
  N4: { maxSentenceLength: 30 },
  N3: { maxSentenceLength: 50 },
  N2: { maxSentenceLength: 80 },
  N1: { maxSentenceLength: 150 },
};

// Background task to replenish the queue
async function replenishQueue(
  supabase: any,
  userId: string,
  jlptLevel: string,
  targetCount: number,
  LOVABLE_API_KEY: string | undefined
) {
  console.log(`[Replenish] Starting background queue replenishment for user ${userId}`);
  
  const difficulty = JLPT_DIFFICULTY[jlptLevel as keyof typeof JLPT_DIFFICULTY] || JLPT_DIFFICULTY.N5;
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Fetch user data in parallel
  const [
    translationsResult,
    vocabularyResult,
    quizResultsResult,
    pastQuestionsResult,
    existingQueueResult,
  ] = await Promise.all([
    supabase
      .from("translations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("vocabulary")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("quiz_results")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("learning_questions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("learning_questions")
      .select("question_text")
      .eq("user_id", userId)
      .eq("was_answered", false)
      .is("served_at", null),
  ]);

  // Content filtering
  const allTranslations = filterItems<TranslationRecord>(
    translationsResult.data || [],
    (t) => [t.source_text, t.target_text],
  );
  
  const recentTranslations = allTranslations.filter((t: TranslationRecord) => 
    new Date(t.created_at) >= weekAgo
  );
  
  const savedVocabulary = filterItems<VocabularyRecord>(
    vocabularyResult.data || [],
    (v) => {
      const texts = [v.word];
      if (typeof v.definition === "string") texts.push(v.definition);
      else if (v.definition?.definitions) texts.push(...v.definition.definitions);
      return texts;
    },
  );
  
  const quizResults = quizResultsResult.data || [];
  const pastQuestions = pastQuestionsResult.data || [];
  const existingQueue = existingQueueResult.data || [];
  
  // Skip if already have enough questions
  const currentQueueSize = existingQueue.length;
  const questionsNeeded = targetCount - currentQueueSize;
  
  if (questionsNeeded <= 0) {
    console.log(`[Replenish] Queue already has ${currentQueueSize} questions. No replenishment needed.`);
    return;
  }

  console.log(`[Replenish] Need to generate ${questionsNeeded} questions`);

  // Avoid duplicate question texts
  const existingTexts = new Set(existingQueue.map((q: any) => q.question_text.toLowerCase()));
  const allPastTexts = new Set(pastQuestions.map((q: LearningQuestionRecord) => q.question_text.toLowerCase()));

  // Analysis
  const frequencyMap = new Map<string, { count: number; translation: TranslationRecord }>();
  allTranslations.forEach((t: TranslationRecord) => {
    const key = t.source_text.toLowerCase().trim();
    const existing = frequencyMap.get(key);
    if (existing) existing.count++;
    else frequencyMap.set(key, { count: 1, translation: t });
  });

  const practicedIds = new Set(
    pastQuestions.filter((q: LearningQuestionRecord) => q.was_answered).map((q: LearningQuestionRecord) => q.original_translation_id).filter(Boolean)
  );

  const wrongQuestionIds = new Set(
    pastQuestions.filter((q: LearningQuestionRecord) => q.was_answered && q.was_correct === false).map((q: LearningQuestionRecord) => q.original_translation_id).filter(Boolean)
  );

  // Question generation
  const newQuestions: GeneratedQuestion[] = [];

  const addQuestion = async (q: GeneratedQuestion): Promise<boolean> => {
    if (newQuestions.length >= questionsNeeded) return false;
    if (existingTexts.has(q.question_text.toLowerCase())) return false;
    
    // Content check
    const textsToCheck = [q.question_text, q.question_data.correct_answer, ...(q.question_data.options || [])];
    for (const text of textsToCheck) {
      const result = await fullContentCheck(text, LOVABLE_API_KEY);
      if (result.isBlocked) return false;
    }
    
    existingTexts.add(q.question_text.toLowerCase());
    newQuestions.push(q);
    return true;
  };

  const generateMeaningChoice = (trans: TranslationRecord, sourceType: SourceType): GeneratedQuestion | null => {
    const wrongOptions = allTranslations
      .filter((t: TranslationRecord) => t.id !== trans.id && t.target_lang === trans.target_lang)
      .slice(0, 3)
      .map((t: TranslationRecord) => t.target_text);
    if (wrongOptions.length < 2) return null;
    return {
      question_type: "meaning_choice",
      source_type: sourceType,
      source_label: SOURCE_LABELS[sourceType],
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
    };
  };

  // Priority 1: Past mistakes
  const pastMistakes = allTranslations.filter((t: TranslationRecord) => wrongQuestionIds.has(t.id));
  for (const trans of pastMistakes.slice(0, 3)) {
    if (trans.source_text.length > difficulty.maxSentenceLength) continue;
    const q = generateMeaningChoice(trans, "past_mistake");
    if (q) await addQuestion(q);
  }

  // Priority 2: Saved vocabulary
  for (const vocab of savedVocabulary.slice(0, 4)) {
    let definitionText = "";
    if (typeof vocab.definition === "string") definitionText = vocab.definition;
    else if (vocab.definition?.definitions?.[0]) definitionText = vocab.definition.definitions[0];
    else if (vocab.definition?.meanings?.[0]?.definition) definitionText = vocab.definition.meanings[0].definition;
    if (!definitionText || definitionText === "번역 문장에서 저장됨") continue;

    const wrongOptions = savedVocabulary
      .filter((v: VocabularyRecord) => v.id !== vocab.id)
      .slice(0, 3)
      .map((v: VocabularyRecord) => {
        if (typeof v.definition === "string") return v.definition;
        if (v.definition?.definitions?.[0]) return v.definition.definitions[0];
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

  // Priority 3: Frequent but unpracticed
  const frequentUnpracticed = Array.from(frequencyMap.values())
    .filter(f => f.count >= 2 && !practicedIds.has(f.translation.id))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(f => f.translation);

  for (const trans of frequentUnpracticed) {
    if (trans.source_text.length > difficulty.maxSentenceLength) continue;
    const q = generateMeaningChoice(trans, "unpracticed");
    if (q) await addQuestion(q);
  }

  // Priority 4: Recent translations
  for (const trans of recentTranslations.slice(0, 5)) {
    if (trans.source_text.length > difficulty.maxSentenceLength) continue;
    const q = generateMeaningChoice(trans, "recent");
    if (q) await addQuestion(q);
  }

  // Priority 5: AI-generated (only if still need more and have API key)
  if (newQuestions.length < questionsNeeded && LOVABLE_API_KEY && allTranslations.length > 0) {
    console.log("[Replenish] Generating AI questions...");
    
    const userPatterns = Array.from(frequencyMap.entries())
      .filter(([_, v]) => v.count >= 2)
      .slice(0, 5)
      .map(([key, v]) => ({ text: v.translation.source_text, count: v.count }));

    const aiPrompt = `Based on these Japanese-Korean translation patterns:
${userPatterns.map(p => `- "${p.text}" (${p.count}회)`).join('\n')}

Generate ${questionsNeeded - newQuestions.length} learning questions at ${jlptLevel} level.
Do not include inappropriate content.

Return JSON array:
[{"word": "Japanese expression", "meaning": "Korean meaning", "reason": "ai_recommended"}]`;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite", // Use cheaper model for background tasks
          messages: [{ role: "user", content: aiPrompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          const aiQuestions = JSON.parse(jsonMatch[0]);
          for (const q of aiQuestions) {
            if (newQuestions.length >= questionsNeeded) break;
            
            const aiCheck = await fullContentCheck(q.word + " " + q.meaning, LOVABLE_API_KEY);
            if (aiCheck.isBlocked) continue;
            
            const wrongMeanings = aiQuestions
              .filter((a: any) => a.word !== q.word)
              .map((a: any) => a.meaning)
              .slice(0, 3);

            if (wrongMeanings.length >= 2) {
              await addQuestion({
                question_type: "meaning_choice",
                source_type: "ai_recommended",
                source_label: SOURCE_LABELS.ai_recommended,
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
      console.error("[Replenish] AI generation failed:", e);
    }
  }

  // Insert new questions into queue
  if (newQuestions.length > 0) {
    const inserts = newQuestions.map(q => ({
      user_id: userId,
      question_type: q.question_type,
      question_text: q.question_text,
      question_data: q.question_data,
      source_lang: q.source_lang,
      target_lang: q.target_lang,
      source_type: q.source_type,
      source_label: q.source_label,
      difficulty_level: q.difficulty_level,
      original_translation_id: q.original_translation_id,
      original_vocabulary_id: q.original_vocabulary_id,
      was_answered: false,
      queued_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("learning_questions").insert(inserts);
    if (error) {
      console.error("[Replenish] Failed to insert questions:", error);
    } else {
      console.log(`[Replenish] Successfully added ${newQuestions.length} questions to queue`);
    }
  }
}

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

    const { targetQueueSize = TARGET_QUEUE_SIZE } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("learning_settings")
      .select("jlpt_level")
      .eq("user_id", user.id)
      .single();

    const jlptLevel = settings?.jlpt_level || "N5";

    // Check current queue size
    const { count: currentQueueSize } = await supabase
      .from("learning_questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("was_answered", false)
      .is("served_at", null);

    const queueSize = currentQueueSize || 0;

    if (queueSize >= targetQueueSize) {
      return new Response(
        JSON.stringify({ 
          message: "Queue already sufficient", 
          queueSize,
          targetQueueSize 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use background task for replenishment (non-blocking)
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(
        replenishQueue(supabase, user.id, jlptLevel, targetQueueSize, LOVABLE_API_KEY)
      );

      return new Response(
        JSON.stringify({ 
          message: "Queue replenishment started in background",
          currentQueueSize: queueSize,
          targetQueueSize,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: synchronous replenishment
    await replenishQueue(supabase, user.id, jlptLevel, targetQueueSize, LOVABLE_API_KEY);

    const { count: newQueueSize } = await supabase
      .from("learning_questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("was_answered", false)
      .is("served_at", null);

    return new Response(
      JSON.stringify({ 
        message: "Queue replenished",
        previousQueueSize: queueSize,
        newQueueSize: newQueueSize || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error replenishing queue:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Handle graceful shutdown
addEventListener("beforeunload", (ev) => {
  // @ts-ignore
  console.log("[Replenish] Function shutdown:", ev.detail?.reason);
});
