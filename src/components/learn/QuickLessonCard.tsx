import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Clock, Zap, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickLessonCardProps {
  title: string;
  description: string;
  questionCount: number;
  estimatedMinutes: number;
  icon: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "warning";
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}

export const QuickLessonCard = ({
  title,
  description,
  questionCount,
  estimatedMinutes,
  icon,
  variant = "primary",
  onClick,
  disabled = false,
  badge,
}: QuickLessonCardProps) => {
  const variantStyles = {
    primary: "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20 hover:border-primary/40",
    secondary: "bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/20 hover:border-secondary/40",
    accent: "bg-gradient-to-br from-accent/20 to-accent/5 border-accent/20 hover:border-accent/40",
    warning: "bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/20 hover:border-orange-500/40",
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
        variantStyles[variant],
        disabled && "opacity-50 cursor-not-allowed hover:scale-100"
      )}
      onClick={() => !disabled && onClick()}
    >
      {badge && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
          {badge}
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-background/50 shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1 truncate">{title}</h3>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {questionCount}문제
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                약 {estimatedMinutes}분
              </span>
              <span className="flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                듣기
              </span>
            </div>
          </div>
        </div>
        <Button 
          className="w-full mt-4 gap-2" 
          disabled={disabled}
          size="sm"
        >
          <Play className="h-4 w-4" />
          바로 시작
        </Button>
      </CardContent>
    </Card>
  );
};
