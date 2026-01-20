import { memo } from "react";
import { Copy, Volume2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TranslationBoxProps {
  value: string;
  onChange?: (value: string) => void;
  onCopy: () => void;
  onSpeak: () => void;
  placeholder?: string;
  isEditable?: boolean;
  onMicClick?: () => void;
  isListening?: boolean;
  audioLevel?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isMobileExpanded?: boolean;
  isMobileFocused?: boolean;
}

export const TranslationBox = memo(({
  value,
  onChange,
  onCopy,
  onSpeak,
  placeholder,
  isEditable = false,
  onMicClick,
  isListening = false,
  audioLevel = 0,
  onFocus,
  onBlur,
  onKeyDown,
  isMobileExpanded = false,
  isMobileFocused = false,
}: TranslationBoxProps) => {
  // Mobile initial state: large open space, no box
  // Mobile focused/has result: half height with bottom border
  // Desktop: always normal box style
  
  if (isEditable) {
    // Mobile expanded (initial, no focus, no result): full height, minimal, centered
    if (isMobileExpanded && !isMobileFocused) {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-[60vh] md:min-h-[160px] md:border md:border-border/50 md:rounded-lg">
          {isListening && (
            <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-primary font-medium z-10">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              음성 인식 중...
            </div>
          )}
          
          <Textarea 
            placeholder={placeholder} 
            value={value} 
            onChange={e => onChange?.(e.target.value)} 
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            className="w-full h-full min-h-[60vh] md:min-h-[160px] resize-none text-lg md:text-base leading-relaxed bg-transparent border-0 p-6 pr-16 text-center placeholder:text-muted-foreground/50 placeholder:text-lg md:placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          
          {/* Mic button - minimal */}
          <div className="absolute bottom-8 flex items-center justify-center">
            {onMicClick && (
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-10 w-10 rounded-full ${isListening ? 'text-primary bg-primary/10' : 'text-muted-foreground/60 hover:text-foreground'}`}
                onClick={onMicClick}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Mobile focused or has result: compact with thick bottom border
    // Desktop: normal box style
    return (
      <div className={`relative h-full min-h-[140px] ${
        isMobileFocused ? 'border-b-2 border-border md:border md:border-border/50 md:rounded-lg' : 'md:border md:border-border/50 md:rounded-lg'
      }`}>
        {isListening && (
          <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-primary font-medium z-10">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            음성 인식 중...
          </div>
        )}
        
        <Textarea 
          placeholder={placeholder} 
          value={value} 
          onChange={e => onChange?.(e.target.value)} 
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="w-full h-full min-h-[140px] resize-none text-base leading-relaxed bg-transparent border-0 p-4 pt-6 pr-20 focus-visible:ring-0 focus-visible:ring-offset-0"
          autoFocus
        />
        
        {/* Action buttons */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1">
          {onMicClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-8 w-8 rounded-full ${isListening ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={onMicClick}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          {value && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={onSpeak}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={onCopy}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Read-only mode (not used anymore, but keeping for compatibility)
  return (
    <div className="relative h-full min-h-[160px] p-4">
      <div className="text-base leading-relaxed whitespace-pre-wrap break-words">
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </div>
      {value && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onSpeak}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

TranslationBox.displayName = "TranslationBox";
