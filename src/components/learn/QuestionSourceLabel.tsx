import { Clock, Repeat, Bookmark, Sparkles, AlertCircle, TrendingUp, Brain, RefreshCw, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export type SourceType = 
  | "recent" 
  | "frequent" 
  | "saved" 
  | "ai_generated"
  | "unpracticed"      // 자주 쓰지만 아직 연습 안 한 표현
  | "past_mistake"     // 예전에 헷갈렸던 표현
  | "trending"         // 요즘 많이 쓰는 표현 기반
  | "ai_recommended"   // AI가 사용 패턴을 보고 추천
  | "review_needed"    // 오래 안 다룬 표현
  | "template";        // 기본 표현 연습

interface QuestionSourceLabelProps {
  sourceType: SourceType;
  className?: string;
}

const sourceConfig: Record<SourceType, { labelKey: string; icon: React.ElementType; variant: "default" | "secondary" | "outline" }> = {
  recent: {
    labelKey: "sourceRecent",
    icon: Clock,
    variant: "secondary",
  },
  frequent: {
    labelKey: "sourceFrequent",
    icon: Repeat,
    variant: "default",
  },
  saved: {
    labelKey: "sourceSaved",
    icon: Bookmark,
    variant: "outline",
  },
  ai_generated: {
    labelKey: "sourceAiGenerated",
    icon: Sparkles,
    variant: "secondary",
  },
  unpracticed: {
    labelKey: "sourceUnpracticed",
    icon: AlertCircle,
    variant: "default",
  },
  past_mistake: {
    labelKey: "sourcePastMistake",
    icon: RefreshCw,
    variant: "outline",
  },
  trending: {
    labelKey: "sourceTrending",
    icon: TrendingUp,
    variant: "secondary",
  },
  ai_recommended: {
    labelKey: "sourceAiRecommended",
    icon: Brain,
    variant: "default",
  },
  review_needed: {
    labelKey: "sourceReviewNeeded",
    icon: Clock,
    variant: "outline",
  },
  template: {
    labelKey: "sourceTemplate",
    icon: BookOpen,
    variant: "secondary",
  },
};

export const QuestionSourceLabel = ({ sourceType, className }: QuestionSourceLabelProps) => {
  const { t } = useTranslation();
  const config = sourceConfig[sourceType] || sourceConfig.ai_generated;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 text-xs font-normal ${className}`}>
      <Icon className="h-3 w-3" />
      {t(config.labelKey)}
    </Badge>
  );
};

export const useSourceLabel = () => {
  const { t } = useTranslation();
  
  return (sourceType: SourceType): string => {
    const config = sourceConfig[sourceType] || sourceConfig.ai_generated;
    return t(config.labelKey);
  };
};
