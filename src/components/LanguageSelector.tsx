import { memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  recentPairs: Array<{ source: string; target: string }>;
  type: "source" | "target";
}

export const LanguageSelector = memo(({
  value,
  onChange,
  recentPairs,
  type
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
      <SelectTrigger className="w-[160px] h-10 bg-card/50 border-0 font-medium transition-all hover:bg-card/80">
        <SelectValue>{selectedLang?.label || value}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {recentPairs.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {t("recent3")} ({recentPairs.length}/3)
            </div>
            {recentPairs.map((pair, idx) => {
              const val = type === "source" ? pair.source : pair.target;
              const lang = languages.find(l => l.code === val);
              return (
                <SelectItem key={idx} value={val} className="pl-6">
                  {lang?.label || val}
                </SelectItem>
              );
            })}
            <div className="my-1 h-px bg-border" />
          </>
        )}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          All Languages
        </div>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

LanguageSelector.displayName = "LanguageSelector";
