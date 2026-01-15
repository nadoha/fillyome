import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
    <div className="space-y-8">
      {/* Main message */}
      <div className="text-center py-4">
        <h2 className="text-lg font-semibold mb-2">학습 준비 중</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          학습 문제를 만들기 위해<br />
          번역 기록이 조금 더 필요해요
        </p>
      </div>

      {/* Progress card */}
      <Card className="border-border shadow-none">
        <CardContent className="p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">진행 상황</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">번역 기록</span>
              <span>
                <span className="font-medium">{translationCount}</span>
                <span className="text-muted-foreground"> / {requiredTranslations}개</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">저장한 단어</span>
              <span>
                <span className="font-medium">{vocabularyCount}</span>
                <span className="text-muted-foreground"> / {requiredVocabulary}개</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground leading-relaxed">
          번역을 몇 번 더 하면<br />
          자동으로 학습이 열립니다
        </p>
      </div>

      {/* CTA */}
      <Button 
        className="w-full"
        onClick={() => navigate("/")}
      >
        번역하러 가기
      </Button>
    </div>
  );
};
