import { memo } from "react";
import { Copy, Volume2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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
  t
}: RecentTranslationItemProps) => {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-card/50 hover:bg-card transition-colors group">
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0 space-y-2">
        {/* Source */}
        <div className="space-y-0.5">
          <div className="flex items-start gap-1.5 group/text">
            <p 
              className="text-sm text-foreground/90 leading-relaxed flex-1 select-text"
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
          {translation.source_romanization && (
            <p className="text-xs text-muted-foreground/50 italic">{translation.source_romanization}</p>
          )}
        </div>

        {/* Target */}
        <div className="space-y-0.5">
          <div className="flex items-start gap-1.5 group/text">
            <p 
              className="text-sm text-primary/80 leading-relaxed font-medium flex-1 select-text"
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
          {translation.target_romanization && (
            <p className="text-xs text-muted-foreground/50 italic">{translation.target_romanization}</p>
          )}
        </div>

        {/* Literal */}
        {translation.literal_translation && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleLiteral}
              className="h-6 px-2 text-xs"
            >
              {showLiteral ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {t("literal")}
            </Button>
            {showLiteral && (
              <div className="mt-1 pl-2 border-l border-primary/20 bg-primary/5 -ml-2 py-1.5 pr-2">
                <p 
                  className="text-xs text-foreground/70 leading-relaxed select-text"
                  onMouseUp={(e) => onTextSelect(e, translation.target_lang, translation.literal_translation || "")}
                >
                  {translation.literal_translation}
                </p>
              </div>
            )}
          </div>
        )}
          
        {/* Feedback */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <Button variant="ghost" size="sm" onClick={() => onFeedback('positive')} className="h-6 px-2 text-xs">
            {t("good")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onFeedback('negative')} className="h-6 px-2 text-xs">
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
