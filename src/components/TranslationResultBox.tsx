import { memo, useState } from "react";
import { Copy, Volume2, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TappableWords } from "./TappableWords";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TranslationResultBoxProps {
  naturalTranslation: string;
  literalTranslation?: string;
  romanization?: string;
  onCopy: () => void;
  onSpeak: () => void;
  onFeedback?: (type: 'positive' | 'negative') => void;
  isTranslating?: boolean;
  placeholder?: string;
  speechSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  onWordSave?: (word: string) => void;
  savedWords?: Set<string>;
}

const SPEED_OPTIONS = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1.0, label: "1x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2.0, label: "2x" },
];

export const TranslationResultBox = memo(({
  naturalTranslation,
  literalTranslation,
  romanization,
  onCopy,
  onSpeak,
  onFeedback,
  isTranslating,
  placeholder,
  speechSpeed = 1.0,
  onSpeedChange,
  onWordSave,
  savedWords = new Set(),
}: TranslationResultBoxProps) => {
  const [showLiteral, setShowLiteral] = useState(false);
  const [showWordHint, setShowWordHint] = useState(true);

  const currentSpeedLabel = SPEED_OPTIONS.find(o => o.value === speechSpeed)?.label || `${speechSpeed}x`;

  return (
    <div className="relative h-full min-h-[160px] p-4 bg-muted/30 rounded-lg">
      {isTranslating ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-3/5" />
        </div>
      ) : naturalTranslation ? (
        <div className="space-y-3">
          {/* Word save hint - dismissible */}
          {onWordSave && showWordHint && (
            <div 
              className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setShowWordHint(false)}
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span>단어를 탭하면 학습 목록에 저장됩니다</span>
            </div>
          )}

          {/* Main translation with tappable words */}
          <div className="text-base leading-relaxed whitespace-pre-wrap break-words pr-8">
            {onWordSave ? (
              <TappableWords 
                text={naturalTranslation} 
                savedWords={savedWords}
                onWordTap={onWordSave}
              />
            ) : (
              naturalTranslation
            )}
          </div>

          {/* Romanization */}
          {romanization && (
            <p className="text-sm text-muted-foreground italic">
              {romanization}
            </p>
          )}

          {/* Literal translation toggle */}
          {literalTranslation && (
            <div className="pt-2 border-t border-border/50">
              <button
                onClick={() => setShowLiteral(!showLiteral)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showLiteral ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                직역
              </button>
              {showLiteral && (
                <p className="mt-2 text-sm text-muted-foreground pl-3 border-l-2 border-primary/30">
                  {literalTranslation}
                </p>
              )}
            </div>
          )}

          {/* Feedback */}
          {onFeedback && (
            <div className="flex items-center gap-1 pt-2">
              <span className="text-xs text-muted-foreground mr-1">번역 품질:</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFeedback('positive')}
                className="h-7 w-7 rounded-full hover:bg-green-500/10 hover:text-green-600"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFeedback('negative')}
                className="h-7 w-7 rounded-full hover:bg-orange-500/10 hover:text-orange-600"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
      
      {/* Action buttons */}
      {!isTranslating && naturalTranslation && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          {/* Speed selector */}
          {onSpeedChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {currentSpeedLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[80px]">
                {SPEED_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onSpeedChange(option.value)}
                    className={speechSpeed === option.value ? "bg-accent" : ""}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onSpeak}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

TranslationResultBox.displayName = "TranslationResultBox";
