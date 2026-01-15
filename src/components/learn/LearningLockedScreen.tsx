import { Lock, Languages, BookOpen, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface LearningLockedScreenProps {
  translationCount: number;
  vocabularyCount: number;
  requiredTranslations: number;
  requiredVocabulary: number;
  progress: number;
}

export const LearningLockedScreen = ({
  translationCount,
  vocabularyCount,
  requiredTranslations,
  requiredVocabulary,
  progress,
}: LearningLockedScreenProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-6">
      {/* Lock Icon with Animation */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-lg">🔒</span>
        </div>
      </div>

      {/* Message */}
      <div className="text-center space-y-2 max-w-sm">
        <h2 className="text-xl font-bold">학습 문제를 준비 중이에요</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          학습 문제를 만들기 위해 번역 기록이 조금 더 필요해요.
          <br />
          번역을 몇 번 더 하면 자동으로 학습이 열립니다.
        </p>
      </div>

      {/* Progress Card */}
      <Card className="w-full max-w-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">해금 진행률</span>
            <span className="text-sm text-primary font-bold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />

          <div className="space-y-3 pt-2">
            {/* Translation Progress */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-primary" />
                <span>번역 기록</span>
              </div>
              <span className={translationCount >= requiredTranslations ? "text-green-500 font-medium" : "text-muted-foreground"}>
                {translationCount} / {requiredTranslations}
                {translationCount >= requiredTranslations && " ✓"}
              </span>
            </div>

            {/* Vocabulary Progress */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-secondary" />
                <span>저장된 단어</span>
              </div>
              <span className={vocabularyCount >= requiredVocabulary ? "text-green-500 font-medium" : "text-muted-foreground"}>
                {vocabularyCount} / {requiredVocabulary}
                {vocabularyCount >= requiredVocabulary && " ✓"}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            둘 중 하나만 달성하면 학습이 열려요!
          </p>
        </CardContent>
      </Card>

      {/* CTA Button */}
      <Button 
        onClick={() => navigate("/")} 
        className="gap-2"
        size="lg"
      >
        번역하러 가기
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
