import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProficiencyLevelProps {
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  isActive: boolean;
  progress: number;
  onClick: () => void;
}

const LEVEL_INFO = {
  N5: { name: "입문", description: "기초 표현과 일상 인사", color: "from-emerald-500 to-emerald-600" },
  N4: { name: "초급", description: "간단한 대화와 기본 문장", color: "from-sky-500 to-sky-600" },
  N3: { name: "중급", description: "일상 대화와 자연스러운 표현", color: "from-violet-500 to-violet-600" },
  N2: { name: "상급", description: "복잡한 맥락과 뉘앙스 이해", color: "from-amber-500 to-amber-600" },
  N1: { name: "고급", description: "네이티브 수준의 표현력", color: "from-rose-500 to-rose-600" },
};

export const ProficiencyLevel = ({
  level,
  isActive,
  progress,
  onClick,
}: ProficiencyLevelProps) => {
  const info = LEVEL_INFO[level];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg",
        isActive 
          ? "ring-2 ring-primary shadow-md" 
          : "opacity-70 hover:opacity-100"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br",
            info.color
          )}>
            {level}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold">{info.name}</h3>
              {isActive && (
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  현재 단계
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{info.description}</p>
            {progress > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full bg-gradient-to-r", info.color)}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};
