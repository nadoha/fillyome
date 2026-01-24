import { memo, useState, useEffect, useRef } from "react";
import { Copy, Volume2, ChevronDown, ChevronUp, ThumbsUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TappableWords } from "./TappableWords";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UsageCards, Alternative, UsageCard, UsageExample } from "./UsageCards";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  speechSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  onWordSave?: (word: string) => void;
  savedWords?: Set<string>;
  alternatives?: Alternative[];
  usageCards?: UsageCard[];
  example?: UsageExample | null;
  onAlternativeSpeak?: (text: string) => void;
  isContextLoading?: boolean;
}

const SPEED_OPTIONS = [{
  value: 0.5,
  label: "0.5x"
}, {
  value: 0.75,
  label: "0.75x"
}, {
  value: 1.0,
  label: "1x"
}, {
  value: 1.25,
  label: "1.25x"
}, {
  value: 1.5,
  label: "1.5x"
}, {
  value: 2.0,
  label: "2x"
}];

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
  alternatives = [],
  usageCards = [],
  example,
  onAlternativeSpeak,
  isContextLoading = false
}: TranslationResultBoxProps) => {
  // Load literal translation state from sessionStorage, default to expanded (true)
  const [showLiteral, setShowLiteral] = useState(() => {
    const saved = sessionStorage.getItem('literalTranslationExpanded');
    return saved !== null ? saved === 'true' : true;
  });
  const [showWordHint, setShowWordHint] = useState(true);
  
  // Progressive disclosure: show cards after main translation appears
  const [showCards, setShowCards] = useState(false);
  const mainTranslationRef = useRef<HTMLDivElement>(null);
  const prevTranslationRef = useRef<string>("");

  // 0.5초 법칙: Main translation shows first, cards appear 1-1.5s later
  useEffect(() => {
    if (naturalTranslation && naturalTranslation !== prevTranslationRef.current) {
      prevTranslationRef.current = naturalTranslation;
      setShowCards(false);
      
      // Cards appear after 1 second delay
      const timer = setTimeout(() => {
        setShowCards(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [naturalTranslation]);

  // Save literal state to sessionStorage when changed
  const handleToggleLiteral = () => {
    const newState = !showLiteral;
    setShowLiteral(newState);
    sessionStorage.setItem('literalTranslationExpanded', String(newState));
  };

  const currentSpeedLabel = SPEED_OPTIONS.find(o => o.value === speechSpeed)?.label || `${speechSpeed}x`;
  
  const hasContextCards = alternatives.length > 0 || usageCards.length > 0 || example;
  
  return (
    <div className="relative h-full min-h-[160px] flex flex-col bg-muted/30 rounded-lg animate-page-transition">
      {/* Main Translation Area - Fixed at top (메인 번역 신성불가침) */}
      <div 
        ref={mainTranslationRef}
        className="flex-shrink-0 p-4 border-b border-border/30"
      >
        {isTranslating ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full animate-shimmer" />
            <Skeleton className="h-5 w-4/5 animate-shimmer" />
            <Skeleton className="h-5 w-3/5 animate-shimmer" />
          </div>
        ) : naturalTranslation ? (
          <div className="space-y-3">
            {/* Word save hint - dismissible */}
            {onWordSave && showWordHint && (
              <button 
                className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1.5 rounded-md hover:bg-muted transition-colors min-h-touch" 
                onClick={() => setShowWordHint(false)}
                aria-label="힌트 닫기"
              >
                <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                <span>단어를 탭하면 학습 목록에 저장됩니다</span>
              </button>
            )}

            {/* Main translation with tappable words */}
            <div className="text-base leading-relaxed whitespace-pre-wrap break-words pr-24">
              {onWordSave ? (
                <TappableWords text={naturalTranslation} savedWords={savedWords} onWordTap={onWordSave} />
              ) : (
                naturalTranslation
              )}
            </div>

            {/* Romanization */}
            {romanization && (
              <p className="text-sm text-muted-foreground italic">{romanization}</p>
            )}

            {/* Literal translation - expanded by default */}
            {literalTranslation && (
              <div className="pt-2 border-t border-border/50">
                <button 
                  onClick={handleToggleLiteral} 
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-touch py-1"
                  aria-expanded={showLiteral}
                  aria-controls="literal-translation"
                >
                  {showLiteral ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
                  직역
                </button>
                {showLiteral && (
                  <p 
                    id="literal-translation"
                    className="mt-2 text-sm text-muted-foreground pl-3 border-l-2 border-primary/30"
                  >
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
                  className="h-10 w-10 rounded-full min-h-touch min-w-touch hover:bg-accent hover:text-accent-foreground haptic"
                  aria-label="좋아요"
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        
        {/* Action buttons - Fixed position with improved touch targets */}
        {!isTranslating && naturalTranslation && (
          <div className="absolute top-3 right-3 flex items-center gap-1">
            {/* Speed selector */}
            {onSpeedChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 px-3 min-h-touch text-xs text-muted-foreground hover:text-foreground haptic"
                    aria-label={`재생 속도: ${currentSpeedLabel}`}
                  >
                    {currentSpeedLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[80px] bg-popover z-50">
                  {SPEED_OPTIONS.map(option => (
                    <DropdownMenuItem 
                      key={option.value} 
                      onClick={() => onSpeedChange(option.value)} 
                      className={cn(
                        "min-h-touch",
                        speechSpeed === option.value && "bg-accent"
                      )}
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
              className="h-10 w-10 rounded-full min-h-touch min-w-touch text-muted-foreground hover:text-foreground haptic" 
              onClick={onSpeak}
              aria-label="번역 결과 듣기"
            >
              <Volume2 className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full min-h-touch min-w-touch text-muted-foreground hover:text-foreground haptic" 
              onClick={onCopy}
              aria-label="번역 결과 복사"
            >
              <Copy className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Context Cards Area - Scrollable (Progressive Disclosure) */}
      {/* Always render the area when there's a translation, show loading indicator if no cards yet */}
      {naturalTranslation && (
        <ScrollArea className="flex-1 max-h-[350px] custom-scrollbar">
          <div className="px-4 pb-32">
            {hasContextCards ? (
              <UsageCards
                alternatives={alternatives}
                usageCards={usageCards}
                example={example}
                onAlternativeSpeak={onAlternativeSpeak}
                isLoading={isContextLoading}
                showCards={showCards}
              />
            ) : (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground animate-pulse-soft">
                <div className="h-1 w-1 rounded-full bg-foreground/40 animate-bounce-soft" />
                <div className="h-1 w-1 rounded-full bg-foreground/40 animate-bounce-soft" style={{ animationDelay: '100ms' }} />
                <div className="h-1 w-1 rounded-full bg-foreground/40 animate-bounce-soft" style={{ animationDelay: '200ms' }} />
                <span className="ml-1">문맥 정보 불러오는 중...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
});

TranslationResultBox.displayName = "TranslationResultBox";
