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
}

export const TranslationBox = memo(({
  value,
  onChange,
  onCopy,
  onSpeak,
  onTextSelect,
  placeholder,
  isTranslating,
  isEditable = false
}: TranslationBoxProps) => {
  if (isEditable) {
    return (
      <div className="relative">
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="min-h-[180px] resize-none text-base leading-relaxed border-0 bg-card/50 rounded-xl p-4 pr-16 focus-visible:ring-1"
          autoFocus
        />
        {value && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={onCopy}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
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
    <div className="relative">
      <div 
        className="min-h-[180px] text-base leading-relaxed border-0 bg-muted/30 rounded-xl p-4 pr-16 select-text"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        onMouseUp={onTextSelect}
      >
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </div>
      {isTranslating && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground flex items-center gap-1">
          <div className="h-2.5 w-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!isTranslating && value && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={onCopy}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
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
