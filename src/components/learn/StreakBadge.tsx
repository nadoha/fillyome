import { Flame, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  streak: number;
  className?: string;
}

export const StreakBadge = ({ streak, className }: StreakBadgeProps) => {
  const getStreakLevel = () => {
    if (streak >= 30) return { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "전설" };
    if (streak >= 14) return { icon: Star, color: "text-purple-500", bg: "bg-purple-500/10", label: "마스터" };
    if (streak >= 7) return { icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10", label: "불꽃" };
    return { icon: Flame, color: "text-primary", bg: "bg-primary/10", label: "" };
  };

  const { icon: Icon, color, bg, label } = getStreakLevel();

  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-full", bg, className)}>
      <Icon className={cn("h-5 w-5", color)} />
      <div className="flex flex-col">
        <span className={cn("font-bold text-lg leading-none", color)}>{streak}</span>
        <span className="text-xs text-muted-foreground">
          {label ? label : "일 연속"}
        </span>
      </div>
    </div>
  );
};
