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
          className="min-h-[180px] md:min-h-[240px] lg:min-h-[320px] resize-none text-base leading-relaxed border border-border bg-card/50 rounded-xl p-4 pr-16 focus-visible:ring-2 focus-visible:ring-ring transition-all"
          autoFocus
        />
        {value && (
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
  }

  return (
    <div className="relative group animate-fade-in">
      <div 
        className="min-h-[180px] md:min-h-[240px] lg:min-h-[320px] border border-border bg-muted/30 rounded-xl p-4 pr-16 select-text transition-colors hover:bg-muted/40"
        onMouseUp={onTextSelect}
      >
        <div className="text-base leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {value || <span className="text-muted-foreground">{placeholder}</span>}
        </div>
        {romanization && value && (
          <div className="mt-2 pt-2 border-t border-border/50 text-sm text-muted-foreground leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {romanization}
          </div>
        )}
      </div>
      {isTranslating && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground flex items-center gap-1.5 animate-fade-in">
          <div className="h-2.5 w-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Translating...</span>
        </div>
      )}
      {!isTranslating && value && (
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

TranslationBox.displayName = "TranslationBox";
