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
          className="min-h-[280px] sm:min-h-[320px] md:min-h-[380px] lg:min-h-[450px] resize-none text-base sm:text-lg leading-relaxed border-2 border-border/60 bg-card/80 backdrop-blur-sm rounded-2xl p-6 sm:p-7 pr-16 sm:pr-20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary shadow-sm hover:shadow-md transition-all duration-200"
          style={{ boxShadow: 'var(--shadow-sm)' }}
          autoFocus
        />
        {value && (
          <div className="absolute top-5 right-5 flex gap-2 opacity-0 sm:group-hover:opacity-100 opacity-100 sm:opacity-0 transition-all duration-200">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
              onClick={onCopy}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
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
        className="min-h-[280px] sm:min-h-[320px] md:min-h-[380px] lg:min-h-[450px] border-2 border-border/60 bg-muted/40 backdrop-blur-sm rounded-2xl p-6 sm:p-7 pr-16 sm:pr-20 select-text transition-all duration-200 hover:bg-muted/50 hover:border-primary/30 shadow-sm"
        style={{ boxShadow: 'var(--shadow-sm)' }}
        onMouseUp={onTextSelect}
      >
        <div className="text-base sm:text-lg leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {value || <span className="text-muted-foreground/70">{placeholder}</span>}
        </div>
        {romanization && value && (
          <div className="mt-4 pt-4 border-t border-border/50 text-sm sm:text-base text-muted-foreground/80 leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {romanization}
          </div>
        )}
      </div>
      {isTranslating && (
        <div className="absolute top-4 right-4 text-xs sm:text-sm text-muted-foreground flex items-center gap-2 animate-fade-in backdrop-blur-sm bg-background/60 px-3 py-1.5 rounded-lg shadow-sm">
          <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Translating...</span>
        </div>
      )}
      {!isTranslating && value && (
        <div className="absolute top-5 right-5 flex gap-2 opacity-0 sm:group-hover:opacity-100 opacity-100 sm:opacity-0 transition-all duration-200">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
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
