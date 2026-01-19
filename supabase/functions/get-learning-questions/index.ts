import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_QUEUE_SIZE = 3;
const TARGET_QUEUE_SIZE = 10;
const PERSONALIZED_RATIO = 0.65; // 65% personalized (user translation history), 35% AI-generated/template

// Learning tab only supports Korean ↔ Japanese
const SUPPORTED_LANGUAGES = ["ko", "ja"];

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

    const { 
      questionCount = 5, 
      targetLanguage = "ja",  // The language user is learning
      sourceLanguage = "ko"   // User's native language
    } = await req.json();

    // Validate language pair - only Korean ↔ Japanese supported
    if (!SUPPORTED_LANGUAGES.includes(targetLanguage) || !SUPPORTED_LANGUAGES.includes(sourceLanguage)) {
      return new Response(JSON.stringify({ 
        error: "Learning only supports Korean ↔ Japanese",
        questions: [] 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Queue] Target language: ${targetLanguage}, Source language: ${sourceLanguage}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // User client for user-specific operations (with RLS)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Service client for accessing template_questions (service_role only)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const userId = claimsData.claims.sub;
    
    // Create a user object for compatibility
    const user = { id: userId };

    // Get user's JLPT level
    const { data: settings } = await supabase
      .from("learning_settings")
      .select("jlpt_level")
      .eq("user_id", user.id)
      .single();

    const jlptLevel = settings?.jlpt_level || "N5";

    // Calculate how many personalized vs template questions
    const personalizedCount = Math.ceil(questionCount * PERSONALIZED_RATIO);
    const templateCount = questionCount - personalizedCount;

    console.log(`[Queue] Fetching ${personalizedCount} personalized + ${templateCount} template questions`);

    // Fetch personalized questions from queue (pre-generated, not answered)
    // Filter by target language to ensure questions are in the learning language
    const { data: personalizedQuestions, error: queueError } = await supabase
      .from("learning_questions")
      .select("*")
      .eq("user_id", user.id)
      .eq("was_answered", false)
      .eq("source_lang", targetLanguage)  // Question must be in target (learning) language
      .is("served_at", null)
      .order("queued_at", { ascending: true })
      .limit(personalizedCount);

    if (queueError) {
      console.error("[Queue] Error fetching personalized questions:", queueError);
    }

    // Fetch template questions (shared, level-appropriate)
    // Avoid recently served templates by checking served questions
    const { data: recentlyServedTemplates } = await supabase
      .from("learning_questions")
      .select("template_question_id")
      .eq("user_id", user.id)
      .eq("is_from_template", true)
      .gte("served_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not("template_question_id", "is", null);

    const excludeTemplateIds = (recentlyServedTemplates || [])
      .map(q => q.template_question_id)
      .filter(Boolean);

    // Fetch template questions matching target language using service client
    let templateQuery = serviceClient
      .from("template_questions")
      .select("*")
      .eq("jlpt_level", jlptLevel)
      .eq("source_lang", targetLanguage)  // Template questions must be in target language
      .eq("target_lang", sourceLanguage)  // Options/answers in user's native language
      .order("usage_count", { ascending: true })
      .limit(templateCount * 2); // Fetch extra for randomization

    if (excludeTemplateIds.length > 0) {
      templateQuery = templateQuery.not("id", "in", `(${excludeTemplateIds.join(",")})`);
    }

    const { data: templateQuestions, error: templateError } = await templateQuery;

    if (templateError) {
      console.error("[Queue] Error fetching template questions:", templateError);
    }

    // Randomly select from templates
    const selectedTemplates = (templateQuestions || [])
      .sort(() => Math.random() - 0.5)
      .slice(0, templateCount);

    // Mark personalized questions as served
    const personalizedIds = (personalizedQuestions || []).map(q => q.id);
    if (personalizedIds.length > 0) {
      await supabase
        .from("learning_questions")
        .update({ served_at: new Date().toISOString() })
        .in("id", personalizedIds);
    }

    // Update template usage count using service client (increment by 1)
    const templateIds = selectedTemplates.map(t => t.id);
    if (templateIds.length > 0) {
      // Note: Simplified update - ideally use RPC for atomic increment
      for (const template of selectedTemplates) {
        await serviceClient
          .from("template_questions")
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq("id", template.id);
      }
      
      // Insert template questions as served for this user
      const templateInserts = selectedTemplates.map(t => ({
        user_id: user.id,
        question_type: t.question_type,
        question_text: t.question_text,
        question_data: t.question_data,
        source_lang: t.source_lang,
        target_lang: t.target_lang,
        source_type: "template",
        source_label: "기본 표현 연습",
        difficulty_level: t.jlpt_level,
        is_from_template: true,
        template_question_id: t.id,
        served_at: new Date().toISOString(),
        was_answered: false,
      }));

      if (templateInserts.length > 0) {
        await supabase.from("learning_questions").insert(templateInserts);
      }
    }

    // Format questions for response
    const formattedPersonalized = (personalizedQuestions || []).map(q => ({
      id: q.id,
      question_type: q.question_type,
      source_type: q.source_type,
      source_label: q.source_label,
      difficulty_level: q.difficulty_level,
      question_text: q.question_text,
      question_data: q.question_data,
      source_lang: q.source_lang,
      target_lang: q.target_lang,
      original_translation_id: q.original_translation_id,
      original_vocabulary_id: q.original_vocabulary_id,
    }));

    const formattedTemplates = selectedTemplates.map(t => ({
      id: t.id,
      question_type: t.question_type,
      source_type: "template",
      source_label: "기본 표현 연습",
      difficulty_level: t.jlpt_level,
      question_text: t.question_text,
      question_data: t.question_data,
      source_lang: t.source_lang,
      target_lang: t.target_lang,
      original_translation_id: null,
      original_vocabulary_id: null,
    }));

    // Mix questions (shuffle personalized and templates together)
    const allQuestions = [...formattedPersonalized, ...formattedTemplates]
      .sort(() => Math.random() - 0.5);

    // Check remaining queue size for background replenishment
    const { count: remainingCount } = await supabase
      .from("learning_questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("was_answered", false)
      .is("served_at", null);

    const needsReplenishment = (remainingCount || 0) < MIN_QUEUE_SIZE;

    console.log(`[Queue] Served ${allQuestions.length} questions. Remaining: ${remainingCount}. Needs replenishment: ${needsReplenishment}`);

    return new Response(
      JSON.stringify({
        questions: allQuestions,
        jlptLevel,
        queueStatus: {
          remaining: remainingCount || 0,
          needsReplenishment,
          personalizedServed: formattedPersonalized.length,
          templateServed: formattedTemplates.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error getting questions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
