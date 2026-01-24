import { memo, useRef, useEffect } from "react";
import { Copy, Volume2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea (min 2 lines, max 5 lines)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to measure scroll height
    textarea.style.height = 'auto';
    
    // Calculate line height (approximately 24px per line)
    const lineHeight = 24;
    const minLines = 2;
    const maxLines = 5;
    const minHeight = lineHeight * minLines;
    const maxHeight = lineHeight * maxLines;
    
    // Set height based on content, clamped between min and max
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  // Listening animation ring
  const ListeningIndicator = () => (
    <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-primary font-medium z-10">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
      </span>
      <span>음성 인식 중...</span>
    </div>
  );

  if (isEditable) {
    // Mobile expanded (initial, no focus, no result): full height, minimal, centered
    if (isMobileExpanded && !isMobileFocused) {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-[60vh] md:min-h-[160px] md:border md:border-border/50 md:rounded-lg animate-page-transition">
          {isListening && <ListeningIndicator />}
          
          <textarea 
            ref={textareaRef}
            placeholder={placeholder}
            value={value} 
            onChange={e => onChange?.(e.target.value)} 
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            className={cn(
              "w-full resize-none text-lg md:text-base leading-relaxed bg-transparent border-0 p-6 pr-16",
              "text-center placeholder:text-muted-foreground/50 placeholder:text-lg md:placeholder:text-base",
              "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder-animated",
              "min-h-[60vh] md:min-h-[160px]"
            )}
            aria-label="번역할 텍스트 입력"
          />
          
          {/* Mic button - centered at bottom with pulse animation when active */}
          <div className="absolute bottom-8 flex items-center justify-center">
            {onMicClick && (
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-12 w-12 rounded-full min-h-touch min-w-touch transition-all duration-200 haptic",
                  isListening 
                    ? "text-primary bg-primary/10 ring-2 ring-primary/30" 
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                )}
                onClick={onMicClick}
                aria-label={isListening ? "음성 인식 중지" : "음성 입력 시작"}
              >
                {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Mobile focused or has result: compact with thick bottom border
    // Desktop: normal box style
    return (
      <div className={cn(
        "relative h-full",
        isMobileFocused 
          ? "border-b-2 border-border md:border md:border-border/50 md:rounded-lg" 
          : "md:border md:border-border/50 md:rounded-lg"
      )}>
        {isListening && <ListeningIndicator />}
        
        <textarea 
          ref={textareaRef}
          placeholder={placeholder} 
          value={value} 
          onChange={e => onChange?.(e.target.value)} 
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full resize-none text-base leading-relaxed bg-transparent border-0",
            "p-4 pt-6 pr-24",
            "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder-animated",
            "min-h-[80px]"
          )}
          autoFocus
          aria-label="번역할 텍스트 입력"
        />
        
        {/* Action buttons - larger touch targets */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {onMicClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-10 w-10 rounded-full min-h-touch min-w-touch transition-all duration-200 haptic",
                isListening 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={onMicClick}
              aria-label={isListening ? "음성 인식 중지" : "음성 입력 시작"}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}
          {value && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full min-h-touch min-w-touch text-muted-foreground hover:text-foreground haptic"
                onClick={onSpeak}
                aria-label="번역 결과 듣기"
              >
                <Volume2 className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full min-h-touch min-w-touch text-muted-foreground hover:text-foreground haptic"
                onClick={onCopy}
                aria-label="텍스트 복사"
              >
                <Copy className="h-5 w-5" />
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
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full min-h-touch min-w-touch text-muted-foreground hover:text-foreground haptic"
            onClick={onSpeak}
            aria-label="번역 결과 듣기"
          >
            <Volume2 className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full min-h-touch min-w-touch text-muted-foreground hover:text-foreground haptic"
            onClick={onCopy}
            aria-label="텍스트 복사"
          >
            <Copy className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
});

TranslationBox.displayName = "TranslationBox";
