import { memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  recentPairs?: Array<{ source: string; target: string }>;
  type?: "source" | "target";
}

const FLAG_MAP: Record<string, string> = {
  ko: "🇰🇷", ja: "🇯🇵", en: "🇺🇸", zh: "🇨🇳",
  es: "🇪🇸", fr: "🇫🇷", de: "🇩🇪", pt: "🇵🇹",
  it: "🇮🇹", ru: "🇷🇺", ar: "🇸🇦", th: "🇹🇭",
  vi: "🇻🇳", id: "🇮🇩", hi: "🇮🇳", tr: "🇹🇷",
};

export const LanguageSelector = memo(({
  value,
  onChange,
  recentPairs = [],
  type = "source"
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
      <SelectTrigger 
        className={cn(
          "w-auto min-w-[110px] h-10 min-h-touch bg-muted/50 border-0 rounded-xl",
          "font-medium text-sm hover:bg-muted",
          "focus:ring-2 focus:ring-ring focus:ring-offset-1",
          "transition-colors duration-200 haptic gap-1.5"
        )}
        aria-label={`${type === "source" ? "원본" : "대상"} 언어 선택: ${selectedLang?.label}`}
      >
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span className="text-base">{FLAG_MAP[value] || ""}</span>
            <span className="text-sm">{selectedLang?.label || value}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px] bg-popover z-50 rounded-xl">
        {languages.map((lang) => (
          <SelectItem 
            key={lang.code} 
            value={lang.code} 
            className="text-sm min-h-touch py-2.5 rounded-lg"
          >
            <span className="flex items-center gap-2">
              <span>{FLAG_MAP[lang.code] || ""}</span>
              <span>{lang.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

LanguageSelector.displayName = "LanguageSelector";
