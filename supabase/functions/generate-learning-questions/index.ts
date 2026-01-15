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
  source_romanization?: string;
  target_romanization?: string;
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
    romaji?: string;
    furigana?: string;
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

    // ===== FETCH ALL USER DATA =====
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Parallel fetch all data sources
    const [
      recentTranslationsResult,
      allTranslationsResult,
      savedVocabularyResult,
      quizResultsResult,
      pastQuestionsResult,
    ] = await Promise.all([
      // Recent translations (last 7 days)
      supabase
        .from("translations")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(50),
      
      // All translations for frequency analysis
      supabase
        .from("translations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(300),
      
      // Saved vocabulary
      supabase
        .from("vocabulary")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      
      // Quiz results (for wrong answers analysis)
      supabase
        .from("quiz_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      
      // Past learning questions (to avoid repetition and find unpracticed)
      supabase
        .from("learning_questions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    // ===== CONTENT FILTERING =====
    console.log("[ContentFilter] Filtering translations and vocabulary for learning content...");
    
    const recentTranslations = filterItems<TranslationRecord>(
      recentTranslationsResult.data || [],
      (t) => [t.source_text, t.target_text],
    );
    
    const allTranslations = filterItems<TranslationRecord>(
      allTranslationsResult.data || [],
      (t) => [t.source_text, t.target_text],
    );
    
    const savedVocabulary = filterItems<VocabularyRecord>(
      savedVocabularyResult.data || [],
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
    
    const quizResults = quizResultsResult.data || [];
    const pastQuestions = pastQuestionsResult.data || [];

    console.log(`[ContentFilter] Filtered: translations ${(allTranslationsResult.data?.length || 0)} -> ${allTranslations.length}, vocabulary ${(savedVocabularyResult.data?.length || 0)} -> ${savedVocabulary.length}`);

    // ===== DATA ANALYSIS =====

    // 1. Frequency analysis
    const frequencyMap = new Map<string, { count: number; translation: TranslationRecord }>();
    allTranslations.forEach((t: TranslationRecord) => {
      const key = t.source_text.toLowerCase().trim();
      const existing = frequencyMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        frequencyMap.set(key, { count: 1, translation: t });
      }
    });

    // 2. Find expressions that appear in learning questions
    const practicedTranslationIds = new Set(
      pastQuestions
        .filter((q: LearningQuestionRecord) => q.was_answered)
        .map((q: LearningQuestionRecord) => q.original_translation_id)
        .filter(Boolean)
    );

    const practicedVocabularyIds = new Set(
      pastQuestions
        .filter((q: LearningQuestionRecord) => q.was_answered)
        .map((q: LearningQuestionRecord) => q.original_vocabulary_id)
        .filter(Boolean)
    );

    // 3. Find wrong answers (past mistakes)
    const wrongAnswers = quizResults.filter((q: QuizResultRecord) => !q.was_correct);
    const wrongVocabularyIds = new Set(
      wrongAnswers
        .map((q: QuizResultRecord) => q.vocabulary_id)
        .filter(Boolean)
    );

    // Find wrong answer translation IDs from past questions
    const wrongQuestionTranslationIds = new Set(
      pastQuestions
        .filter((q: LearningQuestionRecord) => q.was_answered && q.was_correct === false)
        .map((q: LearningQuestionRecord) => q.original_translation_id)
        .filter(Boolean)
    );

    // 4. Find frequently used but never practiced expressions
    const frequentButUnpracticed = Array.from(frequencyMap.values())
      .filter(f => f.count >= 2 && !practicedTranslationIds.has(f.translation.id))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(f => f.translation);

    // 5. Find trending expressions (high frequency in last 7 days)
    const recentFrequencyMap = new Map<string, { count: number; translation: TranslationRecord }>();
    recentTranslations.forEach((t: TranslationRecord) => {
      const key = t.source_text.toLowerCase().trim();
      const existing = recentFrequencyMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        recentFrequencyMap.set(key, { count: 1, translation: t });
      }
    });

    const trendingTranslations = Array.from(recentFrequencyMap.values())
      .filter(f => f.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(f => f.translation);

    // 6. Find old expressions that need review (practiced but not recently)
    const oldPracticedQuestions = pastQuestions
      .filter((q: LearningQuestionRecord) => {
        const questionDate = new Date(q.created_at);
        return q.was_answered && questionDate < twoWeeksAgo;
      });

    const needsReviewTranslationIds = new Set(
      oldPracticedQuestions
        .map((q: LearningQuestionRecord) => q.original_translation_id)
        .filter(Boolean)
    );

    // 7. Find past mistakes that haven't been shown recently
    const recentWrongQuestionIds = new Set(
      pastQuestions
        .filter((q: LearningQuestionRecord) => {
          const questionDate = new Date(q.created_at);
          return questionDate >= weekAgo;
        })
        .map((q: LearningQuestionRecord) => q.original_translation_id || q.original_vocabulary_id)
        .filter(Boolean)
    );

    const pastMistakeTranslations = allTranslations.filter(
      (t: TranslationRecord) => 
        wrongQuestionTranslationIds.has(t.id) && !recentWrongQuestionIds.has(t.id)
    );

    const pastMistakeVocabulary = savedVocabulary.filter(
      (v: VocabularyRecord) => 
        wrongVocabularyIds.has(v.id) && !recentWrongQuestionIds.has(v.id)
    );

    // ===== QUESTION GENERATION =====
    const questions: GeneratedQuestion[] = [];
    const usedSources = new Set<string>();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const addQuestion = async (q: GeneratedQuestion): Promise<boolean> => {
      if (questions.length >= questionCount) return false;
      
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

    const generateMeaningChoiceQuestion = (
      trans: TranslationRecord,
      sourceType: SourceType,
      allTrans: TranslationRecord[]
    ): GeneratedQuestion | null => {
      const wrongOptions = allTrans
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
          romaji: trans.source_romanization || undefined,
        },
        source_lang: trans.source_lang,
        target_lang: trans.target_lang,
      };
    };

    // Priority 1: Past mistakes (예전에 헷갈렸던 표현)
    for (const trans of pastMistakeTranslations.slice(0, 2)) {
      if (usedSources.has(`trans_${trans.id}`)) continue;
      if (trans.source_text.length > difficulty.maxSentenceLength) continue;
      
      usedSources.add(`trans_${trans.id}`);
      const question = generateMeaningChoiceQuestion(trans, "past_mistake", allTranslations);
      if (question) await addQuestion(question);
    }

    // Priority 2: Saved vocabulary (내가 저장한 단어)
    const vocabQuestions = savedVocabulary
      .filter((v: VocabularyRecord) => !usedSources.has(`vocab_${v.id}`))
      .slice(0, Math.ceil(questionCount * 0.25));

    for (const vocab of vocabQuestions) {
      usedSources.add(`vocab_${vocab.id}`);
      
      let definitionText = "";
      if (typeof vocab.definition === "string") {
        definitionText = vocab.definition;
      } else if (vocab.definition?.definitions?.[0]) {
        definitionText = vocab.definition.definitions[0];
      } else if (vocab.definition?.meanings?.[0]?.definition) {
        definitionText = vocab.definition.meanings[0].definition;
      }

      if (!definitionText || definitionText === "번역 문장에서 저장됨") continue;

      const wrongOptions = savedVocabulary
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
          source_type: pastMistakeVocabulary.some(v => v.id === vocab.id) ? "past_mistake" : "saved",
          source_label: pastMistakeVocabulary.some(v => v.id === vocab.id) 
            ? SOURCE_LABELS.past_mistake 
            : SOURCE_LABELS.saved,
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

    // Priority 3: Frequently used but unpracticed (자주 쓰지만 아직 연습 안 한 표현)
    for (const trans of frequentButUnpracticed.slice(0, 2)) {
      if (usedSources.has(`trans_${trans.id}`)) continue;
      if (trans.source_text.length > difficulty.maxSentenceLength) continue;
      
      usedSources.add(`trans_${trans.id}`);
      const question = generateMeaningChoiceQuestion(trans, "unpracticed", allTranslations);
      if (question) await addQuestion(question);
    }

    // Priority 4: Trending expressions (요즘 많이 쓰는 표현)
    for (const trans of trendingTranslations.slice(0, 2)) {
      if (usedSources.has(`trans_${trans.id}`)) continue;
      if (trans.source_text.length > difficulty.maxSentenceLength) continue;
      
      usedSources.add(`trans_${trans.id}`);
      const question = generateMeaningChoiceQuestion(trans, "trending", allTranslations);
      if (question) await addQuestion(question);
    }

    // Priority 5: Needs review (오래 안 다룬 표현)
    const needsReviewTranslations = allTranslations.filter(
      (t: TranslationRecord) => needsReviewTranslationIds.has(t.id)
    );
    
    for (const trans of needsReviewTranslations.slice(0, 2)) {
      if (usedSources.has(`trans_${trans.id}`)) continue;
      if (trans.source_text.length > difficulty.maxSentenceLength) continue;
      
      usedSources.add(`trans_${trans.id}`);
      const question = generateMeaningChoiceQuestion(trans, "review_needed", allTranslations);
      if (question) await addQuestion(question);
    }

    // Priority 6: Frequent translations (자주 번역하는 표현)
    const frequentTranslations = Array.from(frequencyMap.values())
      .filter(f => f.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(f => f.translation);

    for (const trans of frequentTranslations) {
      if (usedSources.has(`trans_${trans.id}`)) continue;
      if (trans.source_text.length > difficulty.maxSentenceLength) continue;
      
      usedSources.add(`trans_${trans.id}`);
      const question = generateMeaningChoiceQuestion(trans, "frequent", allTranslations);
      if (question) await addQuestion(question);
    }

    // Priority 7: Recent translations with fill-in-the-blank
    const recentQuestions = recentTranslations
      .filter((t: TranslationRecord) => !usedSources.has(`trans_${t.id}`))
      .filter((t: TranslationRecord) => t.source_text.length <= difficulty.maxSentenceLength)
      .slice(0, Math.ceil(questionCount * 0.3));

    for (const trans of recentQuestions) {
      usedSources.add(`trans_${trans.id}`);

      if (trans.target_text.length > 5) {
        const words = trans.target_text.split(/\s+/);
        if (words.length >= 3) {
          const blankPosition = Math.floor(Math.random() * words.length);
          const correctWord = words[blankPosition];
          const displayText = words.map((w: string, i: number) => i === blankPosition ? "___" : w).join(" ");

          const wrongWords = allTranslations
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

      const question = generateMeaningChoiceQuestion(trans, "recent", allTranslations);
      if (question) await addQuestion(question);
    }

    // Priority 8: AI-powered recommendations based on usage patterns
    if (questions.length < questionCount && allTranslations.length > 0 && LOVABLE_API_KEY) {
      console.log("[AI] Generating AI-recommended questions based on user patterns...");
      
      // Prepare user analysis data for AI
      const userAnalysis = {
        totalTranslations: allTranslations.length,
        recentCount: recentTranslations.length,
        savedVocabCount: savedVocabulary.length,
        wrongAnswerCount: wrongAnswers.length,
        frequentPatterns: Array.from(frequencyMap.entries())
          .filter(([_, v]) => v.count >= 2)
          .slice(0, 10)
          .map(([key, v]) => ({ text: v.translation.source_text, count: v.count })),
        recentSamples: recentTranslations.slice(0, 5).map((t: TranslationRecord) => ({
          source: t.source_text,
          target: t.target_text,
          lang: `${t.source_lang} -> ${t.target_lang}`
        })),
        jlptLevel,
      };

      const aiPrompt = `You are an AI learning assistant analyzing a user's translation patterns to recommend personalized learning questions.

User Analysis:
- Total translations: ${userAnalysis.totalTranslations}
- Recent (7 days): ${userAnalysis.recentCount}
- Saved vocabulary: ${userAnalysis.savedVocabCount}
- Past wrong answers: ${userAnalysis.wrongAnswerCount}
- Current level: ${userAnalysis.jlptLevel}

Frequent patterns:
${userAnalysis.frequentPatterns.map(p => `- "${p.text}" (${p.count}회)`).join('\n')}

Recent samples:
${userAnalysis.recentSamples.map(s => `- "${s.source}" → "${s.target}"`).join('\n')}

Based on this analysis, generate ${questionCount - questions.length} learning questions that:
1. Match the user's ${jlptLevel} level (NEVER exceed this level)
2. Are related to expressions the user frequently uses
3. Include alternative expressions or similar patterns
4. Focus on practical, everyday expressions

IMPORTANT: Do not include any inappropriate, offensive, sexual, or violent content.

Return as JSON array:
[{
  "word": "Japanese expression",
  "meaning": "Korean meaning",
  "reason": "One of: unpracticed|trending|ai_recommended"
}]`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
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
              if (questions.length >= questionCount) break;
              
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
                const sourceType: SourceType = 
                  q.reason === "unpracticed" ? "unpracticed" :
                  q.reason === "trending" ? "trending" :
                  "ai_recommended";

                await addQuestion({
                  question_type: "meaning_choice",
                  source_type: sourceType,
                  source_label: SOURCE_LABELS[sourceType],
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
        } else {
          console.error("[AI] Response not ok:", response.status);
        }
      } catch (e) {
        console.error("[AI] Question generation failed:", e);
      }
    }

    // Shuffle questions
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5);

    console.log(`[QuestionGen] Generated ${shuffledQuestions.length} questions for user ${user.id}`);

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
