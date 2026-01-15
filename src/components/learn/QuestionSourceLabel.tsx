import { Clock, Repeat, Bookmark, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type SourceType = "recent" | "frequent" | "saved" | "ai_generated";

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
};

export const QuestionSourceLabel = ({ sourceType, className }: QuestionSourceLabelProps) => {
  const config = sourceConfig[sourceType];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 text-xs font-normal ${className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export const getSourceLabel = (sourceType: SourceType): string => {
  return sourceConfig[sourceType].label;
};
