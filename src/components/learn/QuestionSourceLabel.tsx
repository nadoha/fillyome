import { Clock, Repeat, Bookmark, Sparkles, AlertCircle, TrendingUp, Brain, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type SourceType = 
  | "recent" 
  | "frequent" 
  | "saved" 
  | "ai_generated"
  | "unpracticed"      // 자주 쓰지만 아직 연습 안 한 표현
  | "past_mistake"     // 예전에 헷갈렸던 표현
  | "trending"         // 요즘 많이 쓰는 표현 기반
  | "ai_recommended"   // AI가 사용 패턴을 보고 추천
  | "review_needed";   // 오래 안 다룬 표현

interface QuestionSourceLabelProps {
  sourceType: SourceType;
  className?: string;
}

const sourceConfig: Record<SourceType, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "outline" }> = {
  recent: {
    label: "저번에 번역했던 표현",
    icon: Clock,
    variant: "secondary",
  },
  frequent: {
    label: "자주 번역하는 표현",
    icon: Repeat,
    variant: "default",
  },
  saved: {
    label: "내가 저장한 단어",
    icon: Bookmark,
    variant: "outline",
  },
  ai_generated: {
    label: "AI가 내 표현을 바탕으로 만든 문제",
    icon: Sparkles,
    variant: "secondary",
  },
  unpracticed: {
    label: "자주 쓰지만 아직 연습 안 한 표현",
    icon: AlertCircle,
    variant: "default",
  },
  past_mistake: {
    label: "예전에 헷갈렸던 표현",
    icon: RefreshCw,
    variant: "outline",
  },
  trending: {
    label: "요즘 많이 쓰는 표현 기반",
    icon: TrendingUp,
    variant: "secondary",
  },
  ai_recommended: {
    label: "AI가 사용 패턴을 보고 추천",
    icon: Brain,
    variant: "default",
  },
  review_needed: {
    label: "오래 안 다룬 표현",
    icon: Clock,
    variant: "outline",
  },
};

export const QuestionSourceLabel = ({ sourceType, className }: QuestionSourceLabelProps) => {
  const config = sourceConfig[sourceType] || sourceConfig.ai_generated;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 text-xs font-normal ${className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export const getSourceLabel = (sourceType: SourceType): string => {
  return sourceConfig[sourceType]?.label || sourceConfig.ai_generated.label;
};
