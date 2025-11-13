import { memo, useState } from "react";
import { Copy, Volume2, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface TranslationResultBoxProps {
  naturalTranslation: string;
  literalTranslation?: string;
  romanization?: string;
  onCopy: () => void;
  onSpeak: () => void;
  onTextSelect?: (e: React.MouseEvent) => void;
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
  onTextSelect,
  onFeedback,
  isTranslating,
  placeholder
}: TranslationResultBoxProps) => {
  const [showLiteral, setShowLiteral] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="relative group animate-fade-in h-full">
      <div 
        className="h-full min-h-[250px] sm:min-h-[300px] md:min-h-[350px] lg:min-h-[420px] xl:min-h-[480px] border-2 border-border/60 bg-gradient-to-br from-card/80 to-muted/30 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-7 pr-12 sm:pr-14 md:pr-16 lg:pr-20 transition-all duration-300 hover:border-primary/40 shadow-md hover:shadow-lg"
        style={{ boxShadow: 'var(--shadow-md)' }}
        onMouseUp={onTextSelect}
      >
        {isTranslating ? (
          <div className="space-y-3 sm:space-y-4 md:space-y-5 animate-fade-in">
            {/* Loading indicator */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2 backdrop-blur-sm bg-background/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg shadow-sm z-10">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="hidden xs:inline">Translating...</span>
            </div>
            
            {/* Skeleton for main translation */}
            <div className="space-y-2 sm:space-y-3">
              <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-full" />
              <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-5/6" />
              <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-4/5" />
            </div>
            
            {/* Skeleton for romanization */}
            <div className="pt-2 sm:pt-3 md:pt-4 border-t border-border/40">
              <Skeleton className="h-4 sm:h-5 w-3/4" />
            </div>
            
            {/* Skeleton for literal translation toggle */}
            <div className="pt-2 sm:pt-3 md:pt-4 border-t border-border/40">
              <Skeleton className="h-8 sm:h-9 md:h-10 w-32 sm:w-36" />
            </div>
          </div>
        ) : naturalTranslation ? (
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            {/* Natural Translation - Larger, Primary */}
            <div className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl leading-relaxed font-medium text-foreground animate-slide-up" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {naturalTranslation}
            </div>

            {/* Romanization - Always Visible */}
            {romanization && (
              <div className="pt-2 sm:pt-3 md:pt-4 border-t border-border/40 animate-fade-in">
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground/80 leading-relaxed pl-2 sm:pl-3 italic" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {romanization}
                </p>
              </div>
            )}

            {/* Literal Translation Toggle */}
            {literalTranslation && (
              <div className="pt-2 sm:pt-3 md:pt-4 border-t border-border/40 animate-fade-in">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLiteral(!showLiteral)}
                  className="h-8 sm:h-9 md:h-10 px-2 sm:px-3 md:px-4 text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 -ml-2 sm:-ml-3 rounded-lg transition-all duration-200 touch-manipulation"
                >
                  {showLiteral ? <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />}
                  {t("literalTranslation")}
                </Button>
                {showLiteral && (
                  <div className="mt-2 sm:mt-3 md:mt-4 pl-3 sm:pl-4 md:pl-5 border-l-3 border-primary/40 bg-primary/5 backdrop-blur-sm rounded-r-lg py-2 sm:py-3 md:py-4 pr-2 sm:pr-3 md:pr-4 animate-slide-up shadow-sm">
                    <p className="text-xs sm:text-sm md:text-base text-foreground/85 leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {literalTranslation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Buttons - Visually Separated */}
            {onFeedback && (
              <div className="pt-3 sm:pt-4 border-t border-border/30 flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 animate-fade-in">
                <span className="text-xs sm:text-sm text-muted-foreground mr-0.5 sm:mr-1 md:mr-2">{t("howsThisTranslation")}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback('positive')}
                  className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-green-500/15 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-all duration-200 touch-manipulation shadow-sm hover:shadow-md"
                  aria-label={t("good")}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback('negative')}
                  className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-orange-500/15 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-all duration-200 touch-manipulation shadow-sm hover:shadow-md"
                  aria-label={t("feelsOff")}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground/70 text-base sm:text-lg">{placeholder}</span>
        )}
      </div>
      
      {/* Copy and Speak Buttons */}
      {!isTranslating && naturalTranslation && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-5 md:right-5 flex gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11 rounded-lg sm:rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all duration-200 touch-manipulation"
            onClick={onCopy}
          >
            <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11 rounded-lg sm:rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all duration-200 touch-manipulation"
            onClick={onSpeak}
          >
            <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

TranslationResultBox.displayName = "TranslationResultBox";
