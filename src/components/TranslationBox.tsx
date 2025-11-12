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
      <div className="relative group animate-fade-in h-full">
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-full min-h-[200px] sm:min-h-[250px] md:min-h-[320px] lg:min-h-[380px] xl:min-h-[420px] resize-none text-sm sm:text-base md:text-lg leading-relaxed border-2 border-border/60 bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 pr-11 sm:pr-12 md:pr-14 lg:pr-16 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary shadow-sm hover:shadow-md transition-all duration-200"
          style={{ boxShadow: 'var(--shadow-sm)' }}
          autoFocus
        />
        {value && (
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 md:top-4 md:right-4 flex gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg sm:rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
              onClick={onCopy}
            >
              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg sm:rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
              onClick={onSpeak}
            >
              <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative group animate-fade-in h-full">
      <div 
        className="h-full min-h-[200px] sm:min-h-[250px] md:min-h-[320px] lg:min-h-[380px] xl:min-h-[420px] border-2 border-border/60 bg-muted/40 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 pr-11 sm:pr-12 md:pr-14 lg:pr-16 select-text transition-all duration-200 hover:bg-muted/50 hover:border-primary/30 shadow-sm"
        style={{ boxShadow: 'var(--shadow-sm)' }}
        onMouseUp={onTextSelect}
      >
        <div className="text-sm sm:text-base md:text-lg leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {value || <span className="text-muted-foreground/70">{placeholder}</span>}
        </div>
        {romanization && value && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50 text-xs sm:text-sm md:text-base text-muted-foreground/80 leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {romanization}
          </div>
        )}
      </div>
      {isTranslating && (
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2 animate-fade-in backdrop-blur-sm bg-background/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg shadow-sm">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="hidden xs:inline">Translating...</span>
        </div>
      )}
      {!isTranslating && value && (
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 md:top-4 md:right-4 flex gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg sm:rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
            onClick={onCopy}
          >
            <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg sm:rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
            onClick={onSpeak}
          >
            <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

TranslationBox.displayName = "TranslationBox";
