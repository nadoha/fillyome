import { memo } from "react";

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

export interface TranslationAlternative {
  text: string;
  romaji?: string | null;
  situations: string[];
}

export interface TranslationExample {
  jp: string | null;
  kr: string | null;
}

interface ContextCardProps {
  coreMeaning: string;
  usage?: UsageJudgment | null;
  saferAlternative?: SaferAlternative | null;
  alternatives?: TranslationAlternative[] | null;
  example?: TranslationExample | null;
  onAlternativeClick?: () => void;
  onAlternativeSelect?: (text: string, romaji?: string | null) => void;
}

export const ContextCard = memo(({
  coreMeaning,
  usage,
  saferAlternative,
  alternatives,
  example,
  onAlternativeClick,
  onAlternativeSelect,
}: ContextCardProps) => {
  const hasOkFor = usage && usage.ok_for?.length > 0;
  const hasAvoidWhen = usage && usage.avoid_when?.length > 0;
  const hasSaferAlt = saferAlternative && saferAlternative.text;
  const hasAlternatives = alternatives && alternatives.length > 0;
  const hasExample = example && (example.jp || example.kr);
  const hasAnyContent = hasOkFor || hasAvoidWhen || hasSaferAlt || hasAlternatives || hasExample || coreMeaning;

  if (!hasAnyContent) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 animate-fade-in">
      {/* Core Meaning - 원문 */}
      {coreMeaning && (
        <div className="border-l-4 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📝</span>
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">원문</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{coreMeaning}</p>
        </div>
      )}

      {/* OK for - 추천 (Green) */}
      {hasOkFor && (
        <div className="border-l-4 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">✅</span>
            <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-300">추천</h3>
          </div>
          <ul className="space-y-1">
            {usage!.ok_for.map((item, idx) => (
              <li key={idx} className="text-sm text-emerald-700 dark:text-emerald-300">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Avoid when - 주의 (Orange) */}
      {hasAvoidWhen && (
        <div className="border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">⚠️</span>
            <h3 className="font-bold text-sm text-amber-700 dark:text-amber-300">주의</h3>
          </div>
          <ul className="space-y-1">
            {usage!.avoid_when.map((item, idx) => (
              <li key={idx} className="text-sm text-amber-700 dark:text-amber-300">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternatives - 다른 표현 (Cyan) */}
      {hasAlternatives && (
        <div className="border-l-4 border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔄</span>
            <h3 className="font-bold text-sm text-cyan-700 dark:text-cyan-300">다른 표현</h3>
          </div>
          <div className="space-y-2">
            {alternatives!.map((alt, idx) => (
              <div 
                key={idx}
                className="bg-white dark:bg-cyan-950/50 p-3 rounded-lg cursor-pointer hover:bg-cyan-100 dark:hover:bg-cyan-900/50 active:bg-cyan-200 dark:active:bg-cyan-800/50 transition-colors border border-cyan-200 dark:border-cyan-800"
                onClick={() => onAlternativeSelect?.(alt.text, alt.romaji)}
              >
                <p className="text-base font-medium text-cyan-800 dark:text-cyan-200">{alt.text}</p>
                {alt.romaji && (
                  <p className="text-xs text-cyan-500 dark:text-cyan-400 mt-0.5">{alt.romaji}</p>
                )}
                {alt.situations.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs">📍</span>
                    <p className="text-xs text-cyan-600 dark:text-cyan-300">
                      {alt.situations.join(' / ')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safer Alternative - 대안 표현 (Blue) */}
      {hasSaferAlt && (
        <div className="border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">💡</span>
            <h3 className="font-bold text-sm text-blue-700 dark:text-blue-300">격식 표현</h3>
          </div>
          <div 
            className={`bg-white dark:bg-blue-950/50 p-3 rounded-lg ${onAlternativeClick ? 'cursor-pointer active:bg-blue-100 dark:active:bg-blue-900/50 transition-colors' : ''}`}
            onClick={onAlternativeClick}
          >
            <p className="text-lg font-medium text-blue-800 dark:text-blue-200">{saferAlternative!.text}</p>
            {saferAlternative!.romaji && (
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">({saferAlternative!.romaji})</p>
            )}
            {saferAlternative!.reason && (
              <p className="text-sm text-blue-600 dark:text-blue-300 mt-2">{saferAlternative!.reason}</p>
            )}
          </div>
        </div>
      )}

      {/* Example sentence - 예문 (Purple) */}
      {hasExample && (
        <div className="border-l-4 border-purple-400 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">📝</span>
            <h3 className="font-bold text-sm text-purple-700 dark:text-purple-300">예문</h3>
          </div>
          <div className="space-y-1">
            {example!.jp && <p className="text-sm text-purple-800 dark:text-purple-200">{example!.jp}</p>}
            {example!.kr && <p className="text-xs text-purple-600 dark:text-purple-400">{example!.kr}</p>}
          </div>
        </div>
      )}
    </div>
  );
});

ContextCard.displayName = "ContextCard";
