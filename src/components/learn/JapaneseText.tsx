import { cn } from "@/lib/utils";

interface JapaneseTextProps {
  text: string;
  furigana?: string;
  romaji?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showFurigana?: boolean;
  showRomaji?: boolean;
  className?: string;
}

/**
 * Japanese text display with hierarchical layers:
 * 1. Main text (kanji/kana) - most prominent
 * 2. Furigana (hiragana reading) - above main text
 * 3. Romaji - below, subdued
 */
export const JapaneseText = ({
  text,
  furigana,
  romaji,
  size = "lg",
  showFurigana = true,
  showRomaji = true,
  className,
}: JapaneseTextProps) => {
  const sizeClasses = {
    sm: {
      main: "text-lg",
      furigana: "text-[10px]",
      romaji: "text-xs",
    },
    md: {
      main: "text-2xl",
      furigana: "text-xs",
      romaji: "text-sm",
    },
    lg: {
      main: "text-3xl",
      furigana: "text-sm",
      romaji: "text-base",
    },
    xl: {
      main: "text-4xl",
      furigana: "text-base",
      romaji: "text-lg",
    },
  };

  const classes = sizeClasses[size];

  // Check if text contains kanji (CJK Unified Ideographs)
  const hasKanji = /[\u4e00-\u9faf]/.test(text);

  return (
    <div className={cn("flex flex-col items-center gap-0.5", className)}>
      {/* Layer 2: Furigana (only if text has kanji and furigana is provided) */}
      {showFurigana && hasKanji && furigana && (
        <span className={cn(classes.furigana, "text-muted-foreground font-normal tracking-wider")}>
          {furigana}
        </span>
      )}

      {/* Layer 1: Main Japanese text (most prominent) */}
      <span className={cn(classes.main, "font-bold text-foreground leading-tight")}>
        {text}
      </span>

      {/* Layer 3: Romaji (subdued, auxiliary) */}
      {showRomaji && romaji && (
        <span className={cn(classes.romaji, "text-muted-foreground/70 font-normal italic tracking-wide mt-1")}>
          {romaji}
        </span>
      )}
    </div>
  );
};

/**
 * Korean meaning display for flashcard back
 */
interface KoreanMeaningProps {
  meanings: string[];
  partOfSpeech?: string;
  notes?: string;
  size?: "sm" | "md" | "lg";
}

export const KoreanMeaning = ({
  meanings,
  partOfSpeech,
  notes,
  size = "lg",
}: KoreanMeaningProps) => {
  const sizeClasses = {
    sm: {
      pos: "text-xs",
      meaning: "text-lg",
      notes: "text-sm",
    },
    md: {
      pos: "text-sm",
      meaning: "text-xl",
      notes: "text-sm",
    },
    lg: {
      pos: "text-sm",
      meaning: "text-2xl",
      notes: "text-base",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {/* Part of speech tag */}
      {partOfSpeech && (
        <span className={cn(classes.pos, "text-primary font-medium px-2 py-0.5 bg-primary/10 rounded-full")}>
          {partOfSpeech}
        </span>
      )}

      {/* Korean meanings */}
      <div className="space-y-2">
        {meanings.slice(0, 3).map((meaning, idx) => (
          <p key={idx} className={cn(classes.meaning, "font-semibold text-foreground")}>
            {meaning}
          </p>
        ))}
      </div>

      {/* Notes (if any) */}
      {notes && (
        <p className={cn(classes.notes, "text-muted-foreground italic mt-2")}>
          📝 {notes}
        </p>
      )}
    </div>
  );
};
