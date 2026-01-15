import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LearningUnlockStatus {
  isUnlocked: boolean;
  isLoading: boolean;
  translationCount: number;
  vocabularyCount: number;
  requiredTranslations: number;
  requiredVocabulary: number;
  progress: number; // 0-100
  jlptLevel: string;
}

interface LearningSettings {
  min_translations_for_unlock: number;
  min_vocabulary_for_unlock: number;
  jlpt_level: string;
  correct_rate: number;
  total_questions_answered: number;
  total_correct_answers: number;
}

const DEFAULT_SETTINGS: LearningSettings = {
  min_translations_for_unlock: 30,
  min_vocabulary_for_unlock: 20,
  jlpt_level: "N5",
  correct_rate: 0.7,
  total_questions_answered: 0,
  total_correct_answers: 0,
};

export const useLearningUnlock = () => {
  const [status, setStatus] = useState<LearningUnlockStatus>({
    isUnlocked: false,
    isLoading: true,
    translationCount: 0,
    vocabularyCount: 0,
    requiredTranslations: DEFAULT_SETTINGS.min_translations_for_unlock,
    requiredVocabulary: DEFAULT_SETTINGS.min_vocabulary_for_unlock,
    progress: 0,
    jlptLevel: "N5",
  });

  const [settings, setSettings] = useState<LearningSettings>(DEFAULT_SETTINGS);

  const checkUnlockStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Get or create learning settings
      let { data: learningSettings } = await supabase
        .from("learning_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!learningSettings) {
        // Create default settings
        const { data: newSettings } = await supabase
          .from("learning_settings")
          .insert({ user_id: user.id })
          .select()
          .single();
        
        learningSettings = newSettings;
      }

      const currentSettings: LearningSettings = learningSettings 
        ? {
            min_translations_for_unlock: learningSettings.min_translations_for_unlock,
            min_vocabulary_for_unlock: learningSettings.min_vocabulary_for_unlock,
            jlpt_level: learningSettings.jlpt_level,
            correct_rate: Number(learningSettings.correct_rate) || 0.7,
            total_questions_answered: learningSettings.total_questions_answered || 0,
            total_correct_answers: learningSettings.total_correct_answers || 0,
          }
        : DEFAULT_SETTINGS;

      setSettings(currentSettings);

      // Count translations
      const { count: translationCount } = await supabase
        .from("translations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Count vocabulary
      const { count: vocabularyCount } = await supabase
        .from("vocabulary")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const transCount = translationCount || 0;
      const vocabCount = vocabularyCount || 0;

      // Check unlock condition (either condition met)
      const isUnlocked = 
        transCount >= currentSettings.min_translations_for_unlock || 
        vocabCount >= currentSettings.min_vocabulary_for_unlock;

      // Calculate progress (average of both conditions)
      const transProgress = Math.min((transCount / currentSettings.min_translations_for_unlock) * 100, 100);
      const vocabProgress = Math.min((vocabCount / currentSettings.min_vocabulary_for_unlock) * 100, 100);
      const progress = Math.max(transProgress, vocabProgress);

      setStatus({
        isUnlocked,
        isLoading: false,
        translationCount: transCount,
        vocabularyCount: vocabCount,
        requiredTranslations: currentSettings.min_translations_for_unlock,
        requiredVocabulary: currentSettings.min_vocabulary_for_unlock,
        progress,
        jlptLevel: currentSettings.jlpt_level,
      });
    } catch (error) {
      console.error("Failed to check unlock status:", error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const updateJlptLevel = async (newLevel: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("learning_settings")
        .update({ jlpt_level: newLevel })
        .eq("user_id", user.id);

      setSettings(prev => ({ ...prev, jlpt_level: newLevel }));
      setStatus(prev => ({ ...prev, jlptLevel: newLevel }));
    } catch (error) {
      console.error("Failed to update JLPT level:", error);
    }
  };

  const updateQuizStats = async (isCorrect: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newTotal = settings.total_questions_answered + 1;
      const newCorrect = settings.total_correct_answers + (isCorrect ? 1 : 0);
      const newRate = newTotal > 0 ? newCorrect / newTotal : 0;

      // Auto-adjust JLPT level based on performance
      let newLevel = settings.jlpt_level;
      if (newTotal >= 20) { // After at least 20 questions
        if (newRate >= 0.9 && settings.jlpt_level !== "N1") {
          // Upgrade level
          const levels = ["N5", "N4", "N3", "N2", "N1"];
          const currentIdx = levels.indexOf(settings.jlpt_level);
          if (currentIdx < levels.length - 1) {
            newLevel = levels[currentIdx + 1];
          }
        } else if (newRate < 0.5 && settings.jlpt_level !== "N5") {
          // Downgrade level
          const levels = ["N5", "N4", "N3", "N2", "N1"];
          const currentIdx = levels.indexOf(settings.jlpt_level);
          if (currentIdx > 0) {
            newLevel = levels[currentIdx - 1];
          }
        }
      }

      await supabase
        .from("learning_settings")
        .update({ 
          total_questions_answered: newTotal,
          total_correct_answers: newCorrect,
          correct_rate: newRate,
          jlpt_level: newLevel,
        })
        .eq("user_id", user.id);

      setSettings(prev => ({
        ...prev,
        total_questions_answered: newTotal,
        total_correct_answers: newCorrect,
        correct_rate: newRate,
        jlpt_level: newLevel,
      }));

      if (newLevel !== settings.jlpt_level) {
        setStatus(prev => ({ ...prev, jlptLevel: newLevel }));
      }
    } catch (error) {
      console.error("Failed to update quiz stats:", error);
    }
  };

  useEffect(() => {
    checkUnlockStatus();
  }, []);

  return {
    ...status,
    settings,
    checkUnlockStatus,
    updateJlptLevel,
    updateQuizStats,
  };
};
