import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sections = [];

  // 최근 저장한 단어 섹션
  if (stats.recentSavedWords.length > 0) {
    sections.push({
      id: "recent-saved",
      label: "최근 저장한 표현",
      title: "저장한 단어 복습",
      description: `${stats.recentSavedWords.length}개의 표현을 복습할 수 있어요`,
      onClick: () => navigate("/flashcards"),
    });
  }

  // 자주 틀린 단어 섹션
  if (stats.confusedWords.length > 0) {
    sections.push({
      id: "confused",
      label: "자주 헷갈리는 표현",
      title: "다시 연습하기",
      description: `${stats.confusedWords[0]?.word} 외 ${stats.confusedWords.length - 1}개`,
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
      label: `${langName} 번역 기반`,
      title: "번역한 문장으로 학습",
      description: `${mainPattern.count}개의 번역 기록에서 생성`,
      onClick: () => navigate("/translation-quiz"),
    });
  }

  // 데이터가 없을 때
  if (sections.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">나에게 맞춘 학습</h2>
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">
              번역을 하고 단어를 저장하면<br />
              맞춤 학습이 만들어져요
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground mb-3">나에게 맞춘 학습</h2>
      <div className="space-y-2">
        {sections.map((section) => (
          <Card 
            key={section.id}
            className="cursor-pointer border-border hover:bg-muted/30 active:bg-muted/50 transition-colors shadow-none"
            onClick={section.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary font-medium mb-1">{section.label}</p>
                  <p className="text-sm font-medium">{section.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
