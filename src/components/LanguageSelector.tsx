import { memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  recentPairs: Array<{ source: string; target: string }>;
  type: "source" | "target";
  showAutoDetect?: boolean;
}

export const LanguageSelector = memo(({
  value,
  onChange,
  recentPairs,
  type,
  showAutoDetect = false
}: LanguageSelectorProps) => {
  const { t } = useTranslation();

  const languages = [
    { code: "ko", label: t("korean") },
    { code: "ja", label: t("japanese") },
    { code: "en", label: t("english") },
    { code: "zh", label: t("chinese") },
    { code: "es", label: t("spanish") },
    { code: "fr", label: t("french") },
    { code: "de", label: t("german") },
    { code: "pt", label: t("portuguese") },
    { code: "it", label: t("italian") },
    { code: "ru", label: t("russian") },
    { code: "ar", label: t("arabic") },
    { code: "th", label: t("thai") },
    { code: "vi", label: t("vietnamese") },
    { code: "id", label: t("indonesian") },
    { code: "hi", label: t("hindi") },
    { code: "tr", label: t("turkish") },
  ];

  const selectedLang = languages.find(lang => lang.code === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[130px] sm:w-[150px] md:w-[160px] lg:w-[180px] h-10 sm:h-11 md:h-12 bg-card/60 border-2 border-border font-medium text-sm sm:text-base transition-all hover:bg-card/90 hover:border-primary/30 touch-manipulation">
        <SelectValue>
          <span className="truncate">{selectedLang?.label || value}</span>
          {showAutoDetect && type === "source" && (
            <span className="ml-1.5 sm:ml-2 text-xs text-primary font-semibold">(자동)</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[350px] sm:max-h-[450px] bg-popover border-2 border-border shadow-lg z-[100]">
        {recentPairs.length > 0 && (
          <>
            <div className="px-3 py-2 text-xs sm:text-sm font-semibold text-muted-foreground sticky top-0 bg-popover border-b border-border/50">
              {t("recent3")} ({recentPairs.length}/3)
            </div>
            {recentPairs.map((pair, idx) => {
              const val = type === "source" ? pair.source : pair.target;
              const lang = languages.find(l => l.code === val);
              return (
                <SelectItem key={idx} value={val} className="pl-6 sm:pl-8 py-2.5 sm:py-3 text-sm sm:text-base touch-manipulation">
                  {lang?.label || val}
                </SelectItem>
              );
            })}
            <div className="my-1 h-px bg-border" />
          </>
        )}
        <div className="px-3 py-2 text-xs sm:text-sm font-semibold text-muted-foreground sticky top-0 bg-popover border-b border-border/50">
          {t("allLanguages")}
        </div>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="py-2.5 sm:py-3 text-sm sm:text-base touch-manipulation">
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

LanguageSelector.displayName = "LanguageSelector";
