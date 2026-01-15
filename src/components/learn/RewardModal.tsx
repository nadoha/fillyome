import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Trophy, Zap, Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  totalQuestions: number;
  streakMaintained?: boolean;
  newStreak?: number;
}

export const RewardModal = ({
  isOpen,
  onClose,
  score,
  totalQuestions,
  streakMaintained = false,
  newStreak = 0,
}: RewardModalProps) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const percentage = Math.round((score / totalQuestions) * 100);

  useEffect(() => {
    if (isOpen && percentage >= 80) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, percentage]);

  const getEmoji = () => {
    if (percentage === 100) return { emoji: "🎉", text: "완벽해요!", color: "text-yellow-500" };
    if (percentage >= 80) return { emoji: "🌟", text: "훌륭해요!", color: "text-purple-500" };
    if (percentage >= 60) return { emoji: "👍", text: "좋아요!", color: "text-blue-500" };
    if (percentage >= 40) return { emoji: "💪", text: "조금만 더!", color: "text-orange-500" };
    return { emoji: "📚", text: "다시 도전!", color: "text-muted-foreground" };
  };

  const { emoji, text, color } = getEmoji();

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-yellow-400 animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="py-6 space-y-6">
          <div className="text-7xl animate-bounce">{emoji}</div>
          
          <div>
            <h2 className={cn("text-3xl font-bold mb-2", color)}>{text}</h2>
            <p className="text-muted-foreground">레슨을 완료했어요</p>
          </div>

          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
                <Star className="h-6 w-6" />
                {score}/{totalQuestions}
              </div>
              <p className="text-xs text-muted-foreground">정답</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
                <Trophy className="h-6 w-6" />
                {percentage}%
              </div>
              <p className="text-xs text-muted-foreground">정답률</p>
            </div>
          </div>

          {streakMaintained && (
            <div className="flex items-center justify-center gap-2 p-3 bg-orange-500/10 rounded-lg">
              <Zap className="h-5 w-5 text-orange-500" />
              <span className="font-semibold text-orange-600">
                {newStreak}일 연속 달성!
              </span>
              <Heart className="h-5 w-5 text-red-500" />
            </div>
          )}

          <Button onClick={onClose} className="w-full" size="lg">
            계속하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
