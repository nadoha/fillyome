import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionStatus = "familiar" | "needs-practice" | "new" | "mastered";

interface PersonalizedSectionProps {
  title: string;
  description: string;
  status: SectionStatus;
  wordCount: number;
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  disabled?: boolean;
}

const STATUS_LABELS = {
  familiar: "익숙해졌어요",
  "needs-practice": "연습이 필요해요",
  new: "새로운 표현",
  mastered: "완전히 익혔어요",
};

export const PersonalizedSection = ({
  title,
  description,
  status,
  wordCount,
  icon,
  label,
  onClick,
  disabled = false,
}: PersonalizedSectionProps) => {
  return (
    <Card
      className={cn(
        "cursor-pointer border-border hover:bg-muted/30 active:bg-muted/50 transition-colors shadow-none",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onClick()}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">
              {icon}
            </div>
            <div>
              {label && (
                <p className="text-xs text-primary font-medium mb-1">{label}</p>
              )}
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              {wordCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {wordCount}개 · {STATUS_LABELS[status]}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};
