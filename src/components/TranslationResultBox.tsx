import { memo, useState } from "react";
import { Copy, Volume2, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TranslationResultBoxProps {
  naturalTranslation: string;
  literalTranslation?: string;
  romanization?: string;
  onCopy: () => void;
  onSpeak: () => void;
  onFeedback?: (type: 'positive' | 'negative') => void;
  isTranslating?: boolean;
  placeholder?: string;
}

export const TranslationResultBox = memo(({
  naturalTranslation,
  literalTranslation,
  romanization,
  onCopy,
  onSpeak,
  onFeedback,
  isTranslating,
  placeholder,
}: TranslationResultBoxProps) => {
  const [showLiteral, setShowLiteral] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    if (feedbackGiven) return;
    setFeedbackGiven(type);
    onFeedback?.(type);
  };

  return (
    <div className="relative h-full min-h-[160px] p-4 bg-muted/30 rounded-xl transition-all duration-200">
      {isTranslating ? (
        <div className="space-y-3 animate-pulse">
          <Skeleton className="h-5 w-full bg-muted/60" />
          <Skeleton className="h-5 w-4/5 bg-muted/60" />
          <Skeleton className="h-5 w-3/5 bg-muted/60" />
        </div>
      ) : naturalTranslation ? (
        <div className="space-y-3">
          {/* Main translation */}
          <div className="text-base leading-relaxed whitespace-pre-wrap break-words pr-20 selection:bg-primary/20">
            {naturalTranslation}
          </div>

          {/* Romanization */}
          {romanization && (
            <p className="text-sm text-muted-foreground/80 italic">
              {romanization}
            </p>
          )}

          {/* Literal translation toggle */}
          {literalTranslation && (
            <div className="pt-3 border-t border-border/30">
              <button
                onClick={() => setShowLiteral(!showLiteral)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {showLiteral ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                직역 보기
              </button>
              <div className={cn(
                "overflow-hidden transition-all duration-200",
                showLiteral ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
              )}>
                <p className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/40">
                  {literalTranslation}
                </p>
              </div>
            </div>
          )}

          {/* Feedback */}
          {onFeedback && (
            <div className="flex items-center gap-2 pt-3">
              <span className="text-xs text-muted-foreground">번역이 도움이 되었나요?</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleFeedback('positive')}
                  disabled={feedbackGiven !== null}
                  className={cn(
                    "h-7 w-7 rounded-full transition-all",
                    feedbackGiven === 'positive' 
                      ? "bg-green-500/20 text-green-600" 
                      : "hover:bg-green-500/10 hover:text-green-600"
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleFeedback('negative')}
                  disabled={feedbackGiven !== null}
                  className={cn(
                    "h-7 w-7 rounded-full transition-all",
                    feedbackGiven === 'negative' 
                      ? "bg-orange-500/20 text-orange-600" 
                      : "hover:bg-orange-500/10 hover:text-orange-600"
                  )}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full min-h-[120px]">
          <span className="text-muted-foreground/60 text-sm">{placeholder}</span>
        </div>
      )}
      
      {/* Action buttons */}
      {!isTranslating && naturalTranslation && (
        <div className="absolute top-3 right-3 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm border border-border/30">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80"
            onClick={onSpeak}
          >
            <Volume2 className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-7 w-7 rounded-full transition-all",
              copied 
                ? "text-green-600 bg-green-500/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
});

TranslationResultBox.displayName = "TranslationResultBox";
