import { memo } from "react";
import { Copy, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TranslationBoxProps {
  value: string;
  onChange?: (value: string) => void;
  onCopy: () => void;
  onSpeak: () => void;
  onTextSelect?: (e: React.MouseEvent) => void;
  placeholder?: string;
  isTranslating?: boolean;
  isEditable?: boolean;
  romanization?: string;
}

export const TranslationBox = memo(({
  value,
  onChange,
  onCopy,
  onSpeak,
  onTextSelect,
  placeholder,
  isTranslating,
  isEditable = false,
  romanization
}: TranslationBoxProps) => {
  if (isEditable) {
    return (
      <div className="relative group animate-fade-in">
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="min-h-[200px] sm:min-h-[220px] md:min-h-[260px] lg:min-h-[320px] resize-none text-base sm:text-lg leading-relaxed border-2 border-border bg-card/60 rounded-2xl p-4 sm:p-5 pr-14 sm:pr-16 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/50 transition-all"
          autoFocus
        />
        {value && (
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
  }

  return (
    <div className="relative group animate-fade-in">
      <div 
        className="min-h-[200px] sm:min-h-[220px] md:min-h-[260px] lg:min-h-[320px] border-2 border-border bg-muted/30 rounded-2xl p-4 sm:p-5 pr-14 sm:pr-16 select-text transition-colors hover:bg-muted/40"
        onMouseUp={onTextSelect}
      >
        <div className="text-base sm:text-lg leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {value || <span className="text-muted-foreground">{placeholder}</span>}
        </div>
        {romanization && value && (
          <div className="mt-3 pt-3 border-t border-border/50 text-sm sm:text-base text-muted-foreground leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {romanization}
          </div>
        )}
      </div>
      {isTranslating && (
        <div className="absolute top-3 right-3 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2 animate-fade-in">
          <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Translating...</span>
        </div>
      )}
      {!isTranslating && value && (
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

TranslationBox.displayName = "TranslationBox";
