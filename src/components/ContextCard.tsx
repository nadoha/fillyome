import { memo } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

// Standardized schema types matching LLM output
export interface UsageJudgment {
  ok_for: string[];
  avoid_when: string[];
}

export interface SaferAlternative {
  text: string | null;
  romaji?: string | null;
  reason?: string | null;
}

export interface TranslationExample {
  jp: string | null;
  kr: string | null;
}

interface ContextCardProps {
  coreMeaning: string;
  usage?: UsageJudgment | null;
  saferAlternative?: SaferAlternative | null;
  example?: TranslationExample | null;
  onAlternativeClick?: () => void;
}

export const ContextCard = memo(({
  coreMeaning,
  usage,
  saferAlternative,
  example,
  onAlternativeClick,
}: ContextCardProps) => {
  // Check if we have any data to display
  const hasUsage = usage && (usage.ok_for?.length > 0 || usage.avoid_when?.length > 0);
  const hasSaferAlt = saferAlternative && saferAlternative.text;
  const hasExample = example && (example.jp || example.kr);

  // Always render the card container, but sections are conditional
  return (
    <Card className="mt-4 p-4 bg-card border-border/60 animate-fade-in">
      {/* Core Meaning - always show if available */}
      {coreMeaning && (
        <div className="mb-4 pb-3 border-b border-border/40">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">원문</p>
          <p className="text-sm text-foreground/80">{coreMeaning}</p>
        </div>
      )}

      {/* Usage Judgment */}
      {hasUsage && (
        <div className="space-y-3 mb-4">
          {/* OK for */}
          {usage.ok_for && usage.ok_for.length > 0 && (
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">사용 가능</p>
                <p className="text-sm text-foreground/80">
                  {usage.ok_for.join(' · ')}
                </p>
              </div>
            </div>
          )}

          {/* Avoid when */}
          {usage.avoid_when && usage.avoid_when.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">주의</p>
                <p className="text-sm text-foreground/80">
                  {usage.avoid_when.join(' · ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Safer Alternative */}
      {hasSaferAlt && (
        <div className="pt-3 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-2">
            {saferAlternative.reason || '격식 있는 상황에서 추천'}
          </p>
          <div 
            className={`inline-block bg-muted/50 px-3 py-2 rounded-md ${onAlternativeClick ? 'cursor-pointer active:bg-muted transition-colors' : ''}`}
            onClick={onAlternativeClick}
          >
            <p className="text-base font-medium text-foreground">{saferAlternative.text}</p>
            {saferAlternative.romaji && (
              <p className="text-xs text-muted-foreground mt-0.5">({saferAlternative.romaji})</p>
            )}
          </div>
        </div>
      )}

      {/* Example sentence */}
      {hasExample && (
        <div className={`${hasSaferAlt ? 'mt-3 pt-3 border-t border-border/40' : 'pt-3 border-t border-border/40'}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">예문</p>
          {example.jp && <p className="text-sm text-foreground">{example.jp}</p>}
          {example.kr && <p className="text-xs text-muted-foreground mt-0.5">{example.kr}</p>}
        </div>
      )}

      {/* Empty state - show when no data */}
      {!hasUsage && !hasSaferAlt && !hasExample && !coreMeaning && (
        <p className="text-sm text-muted-foreground text-center py-2">
          맥락 정보 없음
        </p>
      )}
    </Card>
  );
});

ContextCard.displayName = "ContextCard";
