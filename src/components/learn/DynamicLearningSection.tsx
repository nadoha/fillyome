import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonalizedSection } from "./PersonalizedSection";
import { 
  MessageSquare, BookMarked, RefreshCw, Lightbulb, 
  Languages, Brain, Sparkles, AlertTriangle 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DynamicStats {
  frequentWords: { word: string; count: number }[];
  recentSavedWords: { word: string; language: string }[];
  confusedWords: { word: string; wrongCount: number }[];
  translationPatterns: { source_lang: string; target_lang: string; count: number }[];
}

export const DynamicLearningSection = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DynamicStats>({
    frequentWords: [],
    recentSavedWords: [],
    confusedWords: [],
    translationPatterns: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDynamicStats();
  }, []);

  const loadDynamicStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 최근 저장한 단어
      const { data: recentWords } = await supabase
        .from("vocabulary")
        .select("word, language")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // 자주 틀린 단어 (quiz_results에서 was_correct = false 집계)
      const { data: wrongAnswers } = await supabase
        .from("quiz_results")
        .select(`
          vocabulary_id,
          vocabulary:vocabulary_id (word)
        `)
        .eq("user_id", user.id)
        .eq("was_correct", false)
        .limit(50);

      // 번역 패턴
      const { data: translations } = await supabase
        .from("translations")
        .select("source_lang, target_lang")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      // 집계 로직
      const confusedMap = new Map<string, number>();
      wrongAnswers?.forEach((item: any) => {
        if (item.vocabulary?.word) {
          const word = item.vocabulary.word;
          confusedMap.set(word, (confusedMap.get(word) || 0) + 1);
        }
      });

      const confusedWords = Array.from(confusedMap.entries())
        .map(([word, wrongCount]) => ({ word, wrongCount }))
        .sort((a, b) => b.wrongCount - a.wrongCount)
        .slice(0, 5);

      // 번역 언어 패턴
      const patternMap = new Map<string, number>();
      translations?.forEach((t) => {
        const key = `${t.source_lang}-${t.target_lang}`;
        patternMap.set(key, (patternMap.get(key) || 0) + 1);
      });

      const translationPatterns = Array.from(patternMap.entries())
        .map(([key, count]) => {
          const [source_lang, target_lang] = key.split("-");
          return { source_lang, target_lang, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setStats({
        frequentWords: [],
        recentSavedWords: recentWords || [],
        confusedWords,
        translationPatterns,
      });
    } catch (error) {
      console.error("Failed to load dynamic stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSectionStatus = (wrongCount: number) => {
    if (wrongCount >= 3) return "needs-practice";
    if (wrongCount >= 1) return "familiar";
    return "mastered";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sections = [];

  // 최근 저장한 단어 섹션
  if (stats.recentSavedWords.length > 0) {
    sections.push({
      id: "recent-saved",
      title: "최근 저장한 표현",
      description: "번역하면서 저장한 단어들을 복습해요",
      status: "new" as const,
      wordCount: stats.recentSavedWords.length,
      icon: <BookMarked className="h-5 w-5 text-blue-500" />,
      onClick: () => navigate("/flashcards"),
    });
  }

  // 자주 틀린 단어 섹션
  if (stats.confusedWords.length > 0) {
    const avgWrongCount = stats.confusedWords.reduce((a, b) => a + b.wrongCount, 0) / stats.confusedWords.length;
    sections.push({
      id: "confused",
      title: "자주 헷갈리는 표현",
      description: `${stats.confusedWords[0]?.word} 외 ${stats.confusedWords.length - 1}개 더 연습이 필요해요`,
      status: getSectionStatus(avgWrongCount),
      wordCount: stats.confusedWords.length,
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      onClick: () => navigate("/wrong-answers"),
    });
  }

  // 번역 패턴 기반 섹션
  if (stats.translationPatterns.length > 0) {
    const mainPattern = stats.translationPatterns[0];
    const langName = {
      ko: "한국어",
      ja: "일본어",
      en: "영어",
      zh: "중국어",
    }[mainPattern.target_lang] || mainPattern.target_lang;

    sections.push({
      id: "translation-pattern",
      title: `${langName} 표현 연습`,
      description: `${mainPattern.count}번 번역한 패턴으로 학습해요`,
      status: mainPattern.count >= 20 ? "familiar" : "new",
      wordCount: mainPattern.count,
      icon: <Languages className="h-5 w-5 text-primary" />,
      onClick: () => navigate("/translation-quiz"),
    });
  }

  // 기본 섹션 (데이터가 없을 때)
  if (sections.length === 0) {
    sections.push({
      id: "start-learning",
      title: "학습을 시작해보세요",
      description: "번역을 하고 단어를 저장하면 맞춤 학습이 만들어져요",
      status: "new" as const,
      wordCount: 0,
      icon: <Sparkles className="h-5 w-5 text-primary" />,
      onClick: () => navigate("/"),
      disabled: false,
    });
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">나에게 맞춘 학습</h2>
      </div>
      <div className="space-y-3">
        {sections.map((section) => (
          <PersonalizedSection
            key={section.id}
            title={section.title}
            description={section.description}
            status={section.status}
            wordCount={section.wordCount}
            icon={section.icon}
            onClick={section.onClick}
            disabled={section.wordCount === 0 && section.id !== "start-learning"}
          />
        ))}
      </div>
    </section>
  );
};
