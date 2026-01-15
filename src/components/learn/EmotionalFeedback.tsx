import { cn } from "@/lib/utils";

interface EmotionalFeedbackProps {
  isCorrect: boolean | null;
  className?: string;
}

const CORRECT_MESSAGES = [
  { emoji: "🎉", text: "정답이에요!" },
  { emoji: "✨", text: "완벽해요!" },
  { emoji: "🌟", text: "훌륭해요!" },
  { emoji: "💪", text: "멋져요!" },
  { emoji: "🔥", text: "대단해요!" },
  { emoji: "👏", text: "잘했어요!" },
];

const INCORRECT_MESSAGES = [
  { emoji: "💭", text: "다음엔 맞출 수 있어요" },
  { emoji: "📝", text: "기억해두세요" },
  { emoji: "🤔", text: "아쉬워요" },
  { emoji: "💪", text: "포기하지 마세요" },
  { emoji: "🌱", text: "성장 중이에요" },
];

export const EmotionalFeedback = ({ isCorrect, className }: EmotionalFeedbackProps) => {
  if (isCorrect === null) return null;

  const messages = isCorrect ? CORRECT_MESSAGES : INCORRECT_MESSAGES;
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl animate-in fade-in zoom-in duration-300",
        isCorrect ? "bg-green-500/10" : "bg-orange-500/10",
        className
      )}
    >
      <span className="text-4xl animate-bounce">{randomMessage.emoji}</span>
      <span
        className={cn(
          "font-semibold text-lg",
          isCorrect ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
        )}
      >
        {randomMessage.text}
      </span>
    </div>
  );
};
