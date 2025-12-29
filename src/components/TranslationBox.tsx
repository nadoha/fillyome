import { memo, useState, useRef, useEffect } from "react";
import { Copy, Volume2, Mic, MicOff, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
}: TranslationBoxProps) => {
  const [copied, setCopied] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    onChange?.("");
    textareaRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(160, textareaRef.current.scrollHeight) + 'px';
    }
  }, [value]);

  if (isEditable) {
    return (
      <div className={cn(
        "relative h-full min-h-[160px] rounded-xl transition-all duration-200",
        isFocused && "ring-2 ring-primary/20"
      )}>
        {/* Listening indicator */}
        {isListening && (
          <div className="absolute top-3 left-4 flex items-center gap-2 text-xs text-primary font-medium z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            음성 인식 중...
          </div>
        )}
        
        <Textarea 
          ref={textareaRef}
          placeholder={placeholder} 
          value={value} 
          onChange={e => onChange?.(e.target.value)} 
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          className="w-full h-full min-h-[160px] resize-none text-base leading-relaxed bg-transparent border-0 p-4 pt-8 focus-visible:ring-0 focus-visible:ring-offset-0 selection:bg-primary/20"
          autoFocus
        />
        
        {/* Clear button */}
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-6 w-6 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/80"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        {/* Action buttons */}
        <div className="absolute bottom-3 right-3 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm border border-border/30">
          {onMicClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-7 w-7 rounded-full transition-all",
                isListening 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
              onClick={onMicClick}
            >
              {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </Button>
          )}
          {value && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80"
                onClick={onSpeak}
              >
                <Volume2 className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-7 w-7 rounded-full transition-all",
                  copied 
                    ? "text-green-600 bg-green-500/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
        </div>
        
        {/* Character count */}
        {value.length > 0 && (
          <div className="absolute bottom-3 left-4 text-xs text-muted-foreground/60">
            {value.length} / 5000
          </div>
        )}
      </div>
    );
  }

  // Read-only mode (not used anymore, but keeping for compatibility)
  return (
    <div className="relative h-full min-h-[160px] p-4 rounded-xl">
      <div className="text-base leading-relaxed whitespace-pre-wrap break-words selection:bg-primary/20">
        {value || <span className="text-muted-foreground/60">{placeholder}</span>}
      </div>
      {value && (
        <div className="absolute bottom-3 right-3 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm border border-border/30">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80"
            onClick={onSpeak}
          >
            <Volume2 className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-7 w-7 rounded-full transition-all",
              copied 
                ? "text-green-600 bg-green-500/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
});

TranslationBox.displayName = "TranslationBox";
