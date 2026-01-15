import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Star, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Level {
  id: "N5" | "N4" | "N3" | "N2" | "N1";
  name: string;
  description: string;
  isUnlocked: boolean;
  isCurrent: boolean;
  progress: number;
}

interface LevelSelectorProps {
  currentLevel: string;
  onLevelChange: (level: string) => void;
  vocabCount: number;
  translationCount: number;
}

const LEVEL_CONFIG: Level[] = [
  { id: "N5", name: "입문 단계", description: "기초 표현과 일상 인사", isUnlocked: true, isCurrent: true, progress: 0 },
  { id: "N4", name: "초급 단계", description: "간단한 대화와 기본 문장", isUnlocked: false, isCurrent: false, progress: 0 },
  { id: "N3", name: "중급 단계", description: "일상 대화와 자연스러운 표현", isUnlocked: false, isCurrent: false, progress: 0 },
  { id: "N2", name: "상급 단계", description: "복잡한 맥락과 뉘앙스 이해", isUnlocked: false, isCurrent: false, progress: 0 },
  { id: "N1", name: "고급 단계", description: "네이티브 수준의 표현력", isUnlocked: false, isCurrent: false, progress: 0 },
];

const LEVEL_COLORS = {
  N5: "from-emerald-500 to-emerald-600",
  N4: "from-sky-500 to-sky-600",
  N3: "from-violet-500 to-violet-600",
  N2: "from-amber-500 to-amber-600",
  N1: "from-rose-500 to-rose-600",
};

export const LevelSelector = ({
  currentLevel,
  onLevelChange,
  vocabCount,
  translationCount,
}: LevelSelectorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 사용자 활동에 따라 레벨 잠금 해제 결정
  const getLevels = (): Level[] => {
    return LEVEL_CONFIG.map((level, index) => {
      // 첫 번째 레벨은 항상 잠금 해제
      if (index === 0) {
        return { ...level, isUnlocked: true, isCurrent: currentLevel === level.id };
      }
      
      // 이전 레벨의 조건을 충족하면 다음 레벨 잠금 해제
      const thresholds = [
        { vocab: 0, translations: 0 },   // N5
        { vocab: 20, translations: 50 }, // N4
        { vocab: 50, translations: 150 }, // N3
        { vocab: 100, translations: 300 }, // N2
        { vocab: 200, translations: 500 }, // N1
      ];
      
      const threshold = thresholds[index];
      const isUnlocked = vocabCount >= threshold.vocab || translationCount >= threshold.translations;
      
      return { 
        ...level, 
        isUnlocked,
        isCurrent: currentLevel === level.id,
        progress: isUnlocked ? Math.min(100, Math.floor((vocabCount / threshold.vocab) * 100)) : 0,
      };
    });
  };

  const levels = getLevels();
  const activeLevel = levels.find(l => l.id === currentLevel) || levels[0];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Button
          variant="ghost"
          className="w-full p-4 h-auto justify-between rounded-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br",
              LEVEL_COLORS[activeLevel.id as keyof typeof LEVEL_COLORS]
            )}>
              {activeLevel.id}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{activeLevel.name}</span>
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  현재
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{activeLevel.description}</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>

        {isExpanded && (
          <div className="border-t">
            {levels.map((level) => (
              <Button
                key={level.id}
                variant="ghost"
                className={cn(
                  "w-full p-3 h-auto justify-start rounded-none border-b last:border-b-0",
                  level.isCurrent && "bg-muted",
                  !level.isUnlocked && "opacity-50"
                )}
                onClick={() => {
                  if (level.isUnlocked) {
                    onLevelChange(level.id);
                    setIsExpanded(false);
                  }
                }}
                disabled={!level.isUnlocked}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br",
                    LEVEL_COLORS[level.id]
                  )}>
                    {level.isUnlocked ? level.id : <Lock className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium">{level.name}</span>
                    <p className="text-xs text-muted-foreground">{level.description}</p>
                  </div>
                  {level.isCurrent && (
                    <Badge variant="secondary" className="text-xs">현재</Badge>
                  )}
                </div>
              </Button>
            ))}
            <div className="p-3 bg-muted/50 text-xs text-muted-foreground text-center">
              단어를 더 저장하고 번역하면 다음 단계가 열려요
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
