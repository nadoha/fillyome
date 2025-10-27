import { memo, useState } from "react";
import { Copy, Volume2, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [showRomanization, setShowRomanization] = useState(false);

  return (
    <div className="relative group animate-fade-in">
      <div 
        className="min-h-[180px] md:min-h-[240px] lg:min-h-[320px] border border-border bg-muted/30 rounded-xl p-4 pr-16 transition-colors hover:bg-muted/40"
        onMouseUp={onTextSelect}
      >
        {isTranslating ? (
          <div className="absolute top-2 right-2 text-xs text-muted-foreground flex items-center gap-1.5 animate-fade-in">
            <div className="h-2.5 w-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Translating...</span>
          </div>
        ) : naturalTranslation ? (
          <div className="space-y-3">
            {/* Natural Translation - Larger, Primary */}
            <div className="text-xl leading-relaxed font-medium text-foreground" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {naturalTranslation}
            </div>

            {/* Romanization Toggle */}
            {romanization && (
              <div className="pt-2 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRomanization(!showRomanization)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2"
                >
                  {showRomanization ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  Romanization
                </Button>
                {showRomanization && (
                  <div className="mt-2 pl-3 border-l-2 border-border/50">
                    <p className="text-sm text-muted-foreground/70 leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {romanization}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Literal Translation Toggle */}
            {literalTranslation && (
              <div className="pt-2 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLiteral(!showLiteral)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2"
                >
                  {showLiteral ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  Literal translation
                </Button>
                {showLiteral && (
                  <div className="mt-2 pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r py-2 pr-2">
                    <p className="text-sm text-foreground/70 leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {literalTranslation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Buttons - Visually Separated */}
            {onFeedback && (
              <div className="pt-3 border-t border-border/20 flex items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">How's this translation?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback('positive')}
                  className="h-7 px-2 text-xs hover:bg-green-500/10 hover:text-green-600"
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Good
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback('negative')}
                  className="h-7 px-2 text-xs hover:bg-orange-500/10 hover:text-orange-600"
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  Feels off
                </Button>
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-base">{placeholder}</span>
        )}
      </div>
      
      {/* Copy and Speak Buttons */}
      {!isTranslating && naturalTranslation && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-accent transition-colors"
            onClick={onCopy}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-accent transition-colors"
            onClick={onSpeak}
          >
            <Volume2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
});

TranslationResultBox.displayName = "TranslationResultBox";
