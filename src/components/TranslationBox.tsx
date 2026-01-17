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
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isMobileExpanded?: boolean;
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
  onKeyDown,
  isMobileExpanded = false,
}: TranslationBoxProps) => {
  // Dynamic height: expanded on mobile when no result yet
  const containerHeight = isMobileExpanded ? 'min-h-[320px] md:min-h-[160px]' : 'min-h-[160px]';
  const textareaHeight = isMobileExpanded ? 'min-h-[320px] md:min-h-[160px]' : 'min-h-[160px]';

  if (isEditable) {
    return (
      <div className={`relative h-full ${containerHeight} transition-all duration-300 ease-out`}>
        {/* Listening indicator */}
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
          onKeyDown={onKeyDown}
          className={`w-full h-full ${textareaHeight} resize-none text-base leading-relaxed bg-transparent border-0 p-4 pt-8 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 ease-out`}
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
