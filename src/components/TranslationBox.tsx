import { memo } from "react";
import { Copy, Volume2, Mic, MicOff, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  onMicClick?: () => void;
  isListening?: boolean;
  noiseCancellation?: boolean;
  onToggleNoiseCancellation?: () => void;
  audioLevel?: number;
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
  romanization,
  onMicClick,
  isListening = false,
  noiseCancellation = true,
  onToggleNoiseCancellation,
  audioLevel = 0
}: TranslationBoxProps) => {
  if (isEditable) {
    return <div className="relative group animate-fade-in flex-1">
        {isListening && <div className="absolute inset-0 rounded-2xl bg-primary/5 animate-pulse pointer-events-none z-10 border-2 border-primary/30" />}
        {isListening && <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 px-4 py-3 bg-primary/95 text-primary-foreground rounded-2xl text-xs sm:text-sm font-medium shadow-lg animate-fade-in backdrop-blur-sm border border-primary-foreground/20">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5 items-end h-6">
                {[...Array(8)].map((_, i) => {
              const barHeight = Math.max(8, audioLevel / 100 * 24 * (0.5 + Math.random() * 0.5));
              return <div key={i} className="w-1 bg-current rounded-full transition-all duration-100 ease-out" style={{
                height: `${isListening ? barHeight : 8}px`,
                animationDelay: `${i * 50}ms`
              }} />;
            })}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <span className="font-semibold">음성 인식 활성화</span>
                </div>
                {audioLevel > 5 ? <span className="text-xs opacity-90 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    목소리 감지됨 ({Math.round(audioLevel)}%)
                  </span> : <span className="text-xs opacity-90 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    목소리를 기다리는 중...
                  </span>}
              </div>
            </div>
            {value && <div className="text-xs opacity-80 max-w-xs truncate border-t border-primary-foreground/20 pt-2 mt-1">
                감지된 텍스트: "{value.slice(0, 50)}{value.length > 50 ? '...' : ''}"
              </div>}
          </div>}
        <Textarea placeholder={placeholder} value={value} onChange={e => onChange?.(e.target.value)} className={`h-full min-h-[180px] sm:min-h-[200px] resize-none text-base sm:text-lg leading-relaxed border border-border/50 bg-card/30 backdrop-blur-sm rounded-2xl p-4 pr-[120px] sm:pr-[130px] focus-visible:ring-1 focus-visible:ring-primary shadow-sm hover:shadow-md transition-all duration-200 ${isListening ? 'border-primary/60 ring-1 ring-primary/20' : ''}`} autoFocus />
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
          {onMicClick && <TooltipProvider>
              <div className="flex gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className={`h-9 w-9 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm shadow-sm transition-all duration-200 ${isListening ? 'bg-destructive text-destructive-foreground border-destructive animate-pulse' : 'hover:bg-primary hover:text-primary-foreground hover:border-primary'}`} onClick={onMicClick}>
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isListening ? '음성 인식 중지' : '음성 입력'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>}
          {value && <>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200" onClick={onCopy}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200" onClick={onSpeak}>
                <Volume2 className="h-4 w-4" />
              </Button>
            </>}
        </div>
      </div>;
  }
  return <div className="relative group animate-fade-in flex-1">
      <div className="h-full min-h-[180px] sm:min-h-[200px] border border-border/50 bg-muted/30 backdrop-blur-sm rounded-2xl p-4 pr-[100px] sm:pr-[110px] select-text transition-all duration-200 hover:bg-muted/40 hover:border-primary/30 shadow-sm" onMouseUp={onTextSelect}>
        <div className="text-base sm:text-lg leading-relaxed" style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
          {value || <span className="text-muted-foreground/70">{placeholder}</span>}
        </div>
        {romanization && value && <div className="mt-3 pt-3 border-t border-border/50 text-sm text-muted-foreground/80 leading-relaxed" style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
            {romanization}
          </div>}
      </div>
      {isTranslating && <div className="absolute top-3 right-3 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 animate-fade-in backdrop-blur-sm bg-background/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="hidden xs:inline">Translating...</span>
        </div>}
      {!isTranslating && value && <div className="absolute top-3 right-3 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200" onClick={onSpeak}>
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>}
    </div>;
});
TranslationBox.displayName = "TranslationBox";