import { memo, useState } from "react";
import { Copy, Volume2, ThumbsUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TappableWords } from "./TappableWords";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContextCard, UsageJudgment, SaferAlternative, TranslationAlternative, TranslationExample } from "./ContextCard";

interface TranslationResultBoxProps {
  naturalTranslation: string;
  literalTranslation?: string;
  romanization?: string;
  sourceText?: string;
  onCopy: () => void;
  onSpeak: () => void;
  onFeedback?: (type: 'positive' | 'negative') => void;
  isTranslating?: boolean;
  placeholder?: string;
  speechSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  onWordSave?: (word: string) => void;
  savedWords?: Set<string>;
  usageJudgment?: UsageJudgment | null;
  saferAlternative?: SaferAlternative | null;
  alternatives?: TranslationAlternative[] | null;
  usageExample?: TranslationExample | null;
  onAlternativeSpeak?: (text: string) => void;
  onAlternativeSelect?: (text: string, romaji?: string | null) => void;
  onExampleSpeak?: (text: string) => void;
}

const SPEED_OPTIONS = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1.0, label: "1x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2.0, label: "2x" }
];

export const TranslationResultBox = memo(({
  naturalTranslation,
  literalTranslation,
  romanization,
  sourceText,
  onCopy,
  onSpeak,
  onFeedback,
  isTranslating,
  placeholder,
  speechSpeed = 1.0,
  onSpeedChange,
  onWordSave,
  savedWords = new Set(),
  usageJudgment,
  saferAlternative,
  alternatives,
  usageExample,
  onAlternativeSpeak,
  onAlternativeSelect,
  onExampleSpeak,
}: TranslationResultBoxProps) => {
  // Literal translation tab state: 'literal' or 'original'
  const [activeTab, setActiveTab] = useState<'literal' | 'original'>(() => {
    const saved = sessionStorage.getItem('translationActiveTab');
    return (saved === 'original') ? 'original' : 'literal';
  });
  const [showWordHint, setShowWordHint] = useState(true);

  // Save tab state to sessionStorage when changed
  const handleTabChange = (tab: 'literal' | 'original') => {
    setActiveTab(tab);
    sessionStorage.setItem('translationActiveTab', tab);
  };

  const currentSpeedLabel = SPEED_OPTIONS.find(o => o.value === speechSpeed)?.label || `${speechSpeed}x`;
  
  // Check if context card has any data to show
  const hasContextData = usageJudgment || saferAlternative || alternatives || usageExample;
  
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

          {/* Literal/Original Tabs - Improved Design */}
          {(literalTranslation || sourceText) && (
            <div className="pt-3 border-t border-border/50">
              {/* Tab buttons */}
              <div className="flex gap-1 mb-3 p-1 bg-muted/50 rounded-lg w-fit">
                {literalTranslation && (
                  <button
                    onClick={() => handleTabChange('literal')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTab === 'literal'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    직역
                  </button>
                )}
                {sourceText && (
                  <button
                    onClick={() => handleTabChange('original')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTab === 'original'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    원문
                  </button>
                )}
              </div>
              {/* Tab content */}
              <div className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/30">
                {activeTab === 'literal' && literalTranslation && (
                  <p>{literalTranslation}</p>
                )}
                {activeTab === 'original' && sourceText && (
                  <p>{sourceText}</p>
                )}
              </div>
            </div>
          )}

          {/* Context Card - always render container when translation exists */}
          {hasContextData && (
            <ContextCard
              coreMeaning={sourceText || ""}
              usage={usageJudgment}
              saferAlternative={saferAlternative}
              alternatives={alternatives}
              example={usageExample}
              onAlternativeClick={() => saferAlternative?.text && onAlternativeSpeak?.(saferAlternative.text)}
              onAlternativeSelect={onAlternativeSelect}
              onExampleSpeak={onExampleSpeak}
            />
          )}

          {/* Feedback */}
          {onFeedback && (
            <div className="flex items-center gap-1 pt-2">
              <span className="text-xs text-muted-foreground mr-1">번역 품질:</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onFeedback('positive')} 
                className="h-7 w-7 rounded-full hover:bg-accent hover:text-accent-foreground"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
      
      {/* Action buttons - Larger touch targets */}
      {!isTranslating && naturalTranslation && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {/* Speed selector */}
          {onSpeedChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-10 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {currentSpeedLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[80px]">
                {SPEED_OPTIONS.map(option => (
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
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" 
            onClick={onSpeak}
          >
            <Volume2 className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" 
            onClick={onCopy}
          >
            <Copy className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
});

TranslationResultBox.displayName = "TranslationResultBox";
