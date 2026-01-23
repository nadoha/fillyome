import { memo } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface UsageJudgment {
  okFor: string[];
  avoidWhen: string[];
}

export interface SaferAlternative {
  text: string;
  romanization?: string;
  note?: string;
}

interface ContextCardProps {
  primaryExpression: string;
  romanization?: string;
  coreMeaning: string;
  judgment?: UsageJudgment;
  saferAlternative?: SaferAlternative;
  onPrimaryClick?: () => void;
  onAlternativeClick?: () => void;
}

export const ContextCard = memo(({
  primaryExpression,
  romanization,
  coreMeaning,
  judgment,
  saferAlternative,
  onPrimaryClick,
  onAlternativeClick,
}: ContextCardProps) => {
  // Don't render if no judgment data
  const hasJudgment = judgment && (judgment.okFor.length > 0 || judgment.avoidWhen.length > 0);
  const hasSaferAlternative = saferAlternative && saferAlternative.text;
  
  if (!hasJudgment && !hasSaferAlternative) return null;

  return (
    <Card className="mt-4 p-4 bg-card border-border/60 animate-fade-in">
      {/* Primary Expression - tappable for audio */}
      <div 
        className={`mb-3 ${onPrimaryClick ? 'cursor-pointer active:opacity-70 transition-opacity' : ''}`}
        onClick={onPrimaryClick}
      >
        <p className="text-lg font-medium text-foreground">{primaryExpression}</p>
        {romanization && (
          <p className="text-sm text-muted-foreground mt-0.5">({romanization})</p>
        )}
      </div>

      {/* Core Meaning */}
      <div className="mb-4 pb-3 border-b border-border/40">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">원문</p>
        <p className="text-sm text-foreground/80">{coreMeaning}</p>
      </div>

      {/* Usage Judgment */}
      {hasJudgment && (
        <div className="space-y-3 mb-4">
          {/* OK for */}
          {judgment.okFor.length > 0 && (
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-success mb-1">사용 가능</p>
                <p className="text-sm text-foreground/80">
                  {judgment.okFor.join(' · ')}
                </p>
              </div>
            </div>
          )}

          {/* Avoid when */}
          {judgment.avoidWhen.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-warning mb-1">주의</p>
                <p className="text-sm text-foreground/80">
                  {judgment.avoidWhen.join(' · ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Safer Alternative */}
      {hasSaferAlternative && (
        <div className="pt-3 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-2">
            {saferAlternative.note || '격식 있는 상황에서 추천'}
          </p>
          <div 
            className={`inline-block bg-muted/50 px-3 py-2 rounded-md ${onAlternativeClick ? 'cursor-pointer active:bg-muted transition-colors' : ''}`}
            onClick={onAlternativeClick}
          >
            <p className="text-base font-medium text-foreground">{saferAlternative.text}</p>
            {saferAlternative.romanization && (
              <p className="text-xs text-muted-foreground mt-0.5">({saferAlternative.romanization})</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
});

ContextCard.displayName = "ContextCard";
