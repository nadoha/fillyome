import { memo, useState } from "react";
import { Copy, Volume2, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="relative group animate-fade-in">
      <div 
        className="min-h-[200px] sm:min-h-[220px] md:min-h-[260px] lg:min-h-[320px] border-2 border-border/60 bg-gradient-to-br from-card/80 to-muted/30 backdrop-blur-sm rounded-2xl p-5 sm:p-6 pr-16 sm:pr-20 transition-all duration-300 hover:border-primary/40 shadow-md hover:shadow-lg"
        style={{ boxShadow: 'var(--shadow-md)' }}
        onMouseUp={onTextSelect}
      >
        {isTranslating ? (
          <div className="absolute top-4 right-4 text-xs sm:text-sm text-muted-foreground flex items-center gap-2 animate-fade-in backdrop-blur-sm bg-background/60 px-3 py-1.5 rounded-lg shadow-sm">
            <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Translating...</span>
          </div>
        ) : naturalTranslation ? (
          <div className="space-y-4 sm:space-y-5">
            {/* Natural Translation - Larger, Primary */}
            <div className="text-lg sm:text-xl lg:text-2xl leading-relaxed font-medium text-foreground animate-slide-up" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {naturalTranslation}
            </div>

            {/* Romanization - Always Visible */}
            {romanization && (
              <div className="pt-3 sm:pt-4 border-t border-border/40 animate-fade-in">
                <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed pl-3 italic" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {romanization}
                </p>
              </div>
            )}

            {/* Literal Translation Toggle */}
            {literalTranslation && (
              <div className="pt-3 sm:pt-4 border-t border-border/40 animate-fade-in">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLiteral(!showLiteral)}
                  className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 -ml-3 rounded-lg transition-all duration-200 touch-manipulation"
                >
                  {showLiteral ? <ChevronUp className="h-4 w-4 mr-1.5" /> : <ChevronDown className="h-4 w-4 mr-1.5" />}
                  {t("literalTranslation")}
                </Button>
                {showLiteral && (
                  <div className="mt-3 sm:mt-4 pl-4 sm:pl-5 border-l-3 border-primary/40 bg-primary/5 backdrop-blur-sm rounded-r-lg py-3 sm:py-4 pr-3 sm:pr-4 animate-slide-up shadow-sm">
                    <p className="text-sm sm:text-base text-foreground/85 leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {literalTranslation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Buttons - Visually Separated */}
            {onFeedback && (
              <div className="pt-4 border-t border-border/30 flex flex-wrap items-center gap-2 sm:gap-3 animate-fade-in">
                <span className="text-xs sm:text-sm text-muted-foreground mr-1 sm:mr-2">{t("howsThisTranslation")}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback('positive')}
                  className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm hover:bg-green-500/15 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-all duration-200 touch-manipulation shadow-sm hover:shadow-md"
                >
                  <ThumbsUp className="h-4 w-4 mr-1.5" />
                  {t("good")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback('negative')}
                  className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm hover:bg-orange-500/15 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-all duration-200 touch-manipulation shadow-sm hover:shadow-md"
                >
                  <ThumbsDown className="h-4 w-4 mr-1.5" />
                  {t("feelsOff")}
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
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 sm:group-hover:opacity-100 opacity-100 sm:opacity-0 transition-all duration-200">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all duration-200 touch-manipulation"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-md transition-all duration-200 touch-manipulation"
            onClick={onSpeak}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

TranslationResultBox.displayName = "TranslationResultBox";
