import { memo, useState } from "react";
import { Copy, Volume2, Trash2, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Translation {
  id: string;
  source_text: string;
  target_text: string;
  source_lang: string;
  target_lang: string;
  source_romanization: string | null;
  target_romanization: string | null;
  literal_translation: string | null;
}

interface RecentTranslationItemProps {
  translation: Translation;
  isSelected: boolean;
  showLiteral: boolean;
  onToggleSelect: () => void;
  onToggleLiteral: () => void;
  onDelete: () => void;
  onCopy: (text: string) => void;
  onSpeak: (text: string, lang: string) => void;
  onTextSelect: (e: React.MouseEvent, lang: string, text: string) => void;
  onFeedback: (type: 'positive' | 'negative') => void;
  noRomanization?: boolean;
  t: (key: string) => string;
}

export const RecentTranslationItem = memo(({
  translation,
  isSelected,
  showLiteral,
  onToggleSelect,
  onToggleLiteral,
  onDelete,
  onCopy,
  onSpeak,
  onTextSelect,
  onFeedback,
  noRomanization = false,
  t
}: RecentTranslationItemProps) => {

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-card/50 hover:bg-card transition-colors group">
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0 space-y-3">
        {/* Source - Smaller, Secondary */}
        <div className="space-y-1">
          <div className="flex items-start gap-1.5 group/text">
            <p 
              className="text-sm text-muted-foreground leading-relaxed flex-1 select-text"
              onMouseUp={(e) => onTextSelect(e, translation.source_lang, translation.source_text)}
            >
              {translation.source_text}
            </p>
            <div className="flex gap-0.5 opacity-0 group-hover/text:opacity-100">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onCopy(translation.source_text)}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onSpeak(translation.source_text, translation.source_lang)}>
                <Volume2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {!noRomanization && translation.source_romanization && (
            <p className="text-xs text-muted-foreground/60 italic ml-1">{translation.source_romanization}</p>
          )}
        </div>

        {/* Target - Larger, Primary */}
        <div className="space-y-2">
          <div className="flex items-start gap-1.5 group/text">
            <p 
              className="text-base text-foreground leading-relaxed font-medium flex-1 select-text"
              onMouseUp={(e) => onTextSelect(e, translation.target_lang, translation.target_text)}
            >
              {translation.target_text}
            </p>
            <div className="flex gap-0.5 opacity-0 group-hover/text:opacity-100">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onCopy(translation.target_text)}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onSpeak(translation.target_text, translation.target_lang)}>
                <Volume2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Target Romanization - Always Visible */}
          {!noRomanization && translation.target_romanization && (
            <div className="pt-1 border-t border-border/20">
              <p className="text-sm text-muted-foreground/70 pl-2">{translation.target_romanization}</p>
            </div>
          )}

          {/* Literal Translation - Collapsible */}
          {translation.literal_translation && (
            <div className="pt-1 border-t border-border/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleLiteral}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2"
              >
                {showLiteral ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                Literal translation
              </Button>
              {showLiteral && (
                <div className="mt-1 pl-2 border-l-2 border-primary/30 bg-primary/5 rounded-r py-1.5 pr-2">
                  <p 
                    className="text-sm text-foreground/70 leading-relaxed select-text"
                    onMouseUp={(e) => onTextSelect(e, translation.target_lang, translation.literal_translation || "")}
                  >
                    {translation.literal_translation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
          
        {/* Feedback - Visually Separated */}
        <div className="pt-2 border-t border-border/20 flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-0.5">How's this?</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onFeedback('positive')} 
            className="h-6 px-2 text-xs hover:bg-green-500/10 hover:text-green-600"
          >
            <ThumbsUp className="h-3 w-3 mr-1" />
            {t("good")}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onFeedback('negative')} 
            className="h-6 px-2 text-xs hover:bg-orange-500/10 hover:text-orange-600"
          >
            <ThumbsDown className="h-3 w-3 mr-1" />
            {t("feelsOff")}
          </Button>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
});

RecentTranslationItem.displayName = "RecentTranslationItem";
