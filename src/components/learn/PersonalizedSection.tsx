import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Sparkles, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionStatus = "familiar" | "needs-practice" | "new" | "mastered";

interface PersonalizedSectionProps {
  title: string;
  description: string;
  status: SectionStatus;
  wordCount: number;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

const STATUS_CONFIG = {
  familiar: {
    label: "익숙해졌어요",
    icon: CheckCircle,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  "needs-practice": {
    label: "조금 더 연습해요",
    icon: AlertCircle,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
  },
  new: {
    label: "새로운 표현",
    icon: Sparkles,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
  },
  mastered: {
    label: "완전히 익혔어요",
    icon: TrendingUp,
    color: "text-violet-500",
    bgColor: "bg-violet-50 dark:bg-violet-500/10",
  },
};

export const PersonalizedSection = ({
  title,
  description,
  status,
  wordCount,
  icon,
  onClick,
  disabled = false,
}: PersonalizedSectionProps) => {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100"
      )}
      onClick={() => !disabled && onClick()}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-muted shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold line-clamp-1">{title}</h3>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {wordCount}개
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {description}
            </p>
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
              config.bgColor,
              config.color
            )}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </div>
          </div>
        </div>
        <Button 
          className="w-full mt-3 gap-2" 
          size="sm"
          variant="secondary"
          disabled={disabled}
        >
          <Play className="h-4 w-4" />
          연습하기
        </Button>
      </CardContent>
    </Card>
  );
};
