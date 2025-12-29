import { memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  recentPairs?: Array<{ source: string; target: string }>;
  type?: "source" | "target";
}

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
      <SelectTrigger className="w-auto min-w-[80px] h-9 bg-transparent border-0 font-medium text-sm hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
        <SelectValue>
          <span>{selectedLang?.label || value}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="text-sm">
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

LanguageSelector.displayName = "LanguageSelector";
