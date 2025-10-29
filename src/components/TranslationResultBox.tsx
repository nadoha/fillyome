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
        className="min-h-[200px] sm:min-h-[220px] md:min-h-[260px] lg:min-h-[320px] border-2 border-border bg-gradient-to-br from-muted/30 to-muted/20 rounded-2xl p-4 sm:p-5 pr-14 sm:pr-16 transition-all hover:bg-muted/40 hover:border-primary/20"
        onMouseUp={onTextSelect}
      >
        {isTranslating ? (
          <div className="absolute top-3 right-3 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2 animate-fade-in">
            <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Translating...</span>
          </div>
        ) : naturalTranslation ? (
          <div className="space-y-3 sm:space-y-4">
            {/* Natural Translation - Larger, Primary */}
            <div className="text-lg sm:text-xl lg:text-2xl leading-relaxed font-medium text-foreground" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {naturalTranslation}
            </div>

            {/* Romanization - Always Visible */}
            {romanization && (
              <div className="pt-2 sm:pt-3 border-t border-border/30">
                <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed pl-2" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {romanization}
                </p>
              </div>
            )}

            {/* Literal Translation Toggle */}
            {literalTranslation && (
              <div className="pt-2 sm:pt-3 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLiteral(!showLiteral)}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground hover:text-foreground -ml-2 touch-manipulation"
                >
                  {showLiteral ? <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />}
                  {t("literalTranslation")}
                </Button>
                {showLiteral && (
                  <div className="mt-2 sm:mt-3 pl-3 sm:pl-4 border-l-2 border-primary/30 bg-primary/5 rounded-r py-2 sm:py-3 pr-2 sm:pr-3 animate-fade-in">
                    <p className="text-sm sm:text-base text-foreground/80 leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {literalTranslation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Buttons - Visually Separated */}
            {onFeedback && (
              <div className="pt-3 border-t border-border/20 flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground mr-1">{t("howsThisTranslation")}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback('positive')}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm hover:bg-green-500/10 hover:text-green-600 touch-manipulation"
                >
                  <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  {t("good")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback('negative')}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm hover:bg-orange-500/10 hover:text-orange-600 touch-manipulation"
                >
                  <ThumbsDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  {t("feelsOff")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-base sm:text-lg">{placeholder}</span>
        )}
      </div>
      
      {/* Copy and Speak Buttons */}
      {!isTranslating && naturalTranslation && (
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 sm:group-hover:opacity-100 opacity-100 sm:opacity-0 transition-opacity">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-accent transition-colors touch-manipulation"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-accent transition-colors touch-manipulation"
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
