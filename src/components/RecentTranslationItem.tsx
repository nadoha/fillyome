import { memo, useState } from "react";
import { Copy, Volume2, Trash2, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Star } from "lucide-react";
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
  is_favorite: boolean;
}
interface RecentTranslationItemProps {
  translation: Translation;
  isSelected: boolean;
  showLiteral: boolean;
  onToggleSelect: () => void;
  onToggleLiteral: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onCopy: (text: string) => void;
  onSpeak: (text: string, lang: string, romanization?: string) => void;
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
  onToggleFavorite,
  onDelete,
  onCopy,
  onSpeak,
  onTextSelect,
  onFeedback,
  noRomanization = false,
  t
}: RecentTranslationItemProps) => {
  return <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors group space-y-2">
      {/* Header: Checkbox + Favorite + Delete */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-6 w-6 ${translation.is_favorite ? 'text-yellow-500' : 'text-muted-foreground'}`}
            onClick={onToggleFavorite}
          >
            <Star className={`h-3.5 w-3.5 ${translation.is_favorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Source Text - Full Width */}
      <div 
        className="text-sm text-muted-foreground leading-relaxed select-text break-words" 
        onMouseUp={e => onTextSelect(e, translation.source_lang, translation.source_text)}
      >
        {translation.source_text}
      </div>
      {!noRomanization && translation.source_romanization && (
        <p className="text-xs text-muted-foreground/60 italic">{translation.source_romanization}</p>
      )}

      {/* Target Text - Full Width, Emphasized */}
      <div 
        className="text-base text-foreground leading-relaxed font-medium select-text break-words" 
        onMouseUp={e => onTextSelect(e, translation.target_lang, translation.target_text)}
      >
        {translation.target_text}
      </div>
      {!noRomanization && translation.target_romanization && (
        <p className="text-sm text-muted-foreground/70">{translation.target_romanization}</p>
      )}

      {/* Literal Translation - Collapsible */}
      {translation.literal_translation && (
        <div className="pt-1 border-t border-border/20">
          <Button variant="ghost" size="sm" onClick={onToggleLiteral} className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2">
            {showLiteral ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {t("literalTranslation")}
          </Button>
          {showLiteral && (
            <div className="mt-1 pl-2 border-l-2 border-primary/30 bg-primary/5 rounded-r py-1.5 pr-2">
              <p className="text-sm text-foreground/70 leading-relaxed select-text break-words" onMouseUp={e => onTextSelect(e, translation.target_lang, translation.literal_translation || "")}>
                {translation.literal_translation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Actions: Copy, Speak, Feedback */}
      <div className="pt-2 border-t border-border/20 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopy(translation.target_text)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSpeak(translation.target_text, translation.target_lang, translation.target_romanization || undefined)}>
            <Volume2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">{t("howsThis")}</span>
          <Button variant="ghost" size="icon" onClick={() => onFeedback('positive')} className="h-7 w-7 hover:bg-green-500/10 hover:text-green-600" aria-label={t("good")}>
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onFeedback('negative')} className="h-7 w-7 hover:bg-orange-500/10 hover:text-orange-600" aria-label={t("feelsOff")}>
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>;
});
RecentTranslationItem.displayName = "RecentTranslationItem";