import { Trash2, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { RecentTranslationItem } from "./RecentTranslationItem";
import { AuthHeader } from "./AuthHeader";
interface Translation {
  id: string;
  source_text: string;
  target_text: string;
  source_lang: string;
  target_lang: string;
  is_favorite: boolean;
  created_at: string;
  content_classification: string;
  masked_source_text: string | null;
  masked_target_text: string | null;
  source_romanization: string | null;
  target_romanization: string | null;
  literal_translation: string | null;
}
interface AppSidebarProps {
  recentTranslations: Translation[];
  selectedIds: Set<string>;
  showLiteral: Record<string, boolean>;
  onToggleSelect: (id: string) => void;
  onToggleLiteral: (id: string, sourceLang: string, targetLang: string) => void;
  onDelete: (id: string) => void;
  onBulkDelete: () => void;
  onCopy: (text: string) => void;
  onSpeak: (text: string, lang: string, romanization?: string) => void;
  onTextSelect: (e: React.MouseEvent, lang: string, text: string) => void;
  onFeedback: (translation: Translation, type: 'positive' | 'negative') => void;
  noRomanizationLangs: string[];
}
export function AppSidebar({
  recentTranslations,
  selectedIds,
  showLiteral,
  onToggleSelect,
  onToggleLiteral,
  onDelete,
  onBulkDelete,
  onCopy,
  onSpeak,
  onTextSelect,
  onFeedback,
  noRomanizationLangs
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { open } = useSidebar();

  return (
    <Sidebar className="border-r bg-card/50 backdrop-blur-sm" collapsible="icon">
      <SidebarHeader className="border-b px-4 py-6 bg-gradient-to-br from-primary/5 to-primary/10">
        {open ? (
          <div className="space-y-4 animate-fade-in">
            <AuthHeader />
            <div className="flex items-center gap-3 pt-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold">{t("translationHistory")}</h2>
                <p className="text-xs text-muted-foreground">{t("max50")}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <History className="h-5 w-5 text-primary" />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-4 py-4">
        {selectedIds.size > 0 && (
          <div className="mb-4 animate-fade-in">
            <Button
              variant="destructive"
              size="sm"
              onClick={onBulkDelete}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("deleteSelected")} ({selectedIds.size})
            </Button>
          </div>
        )}
        
        <SidebarGroup>
          <SidebarGroupContent className="space-y-2">
            {recentTranslations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("noHistory")}
              </p>
            ) : (
              recentTranslations.map((translation) => (
                <RecentTranslationItem
                  key={translation.id}
                  translation={translation}
                  isSelected={selectedIds.has(translation.id)}
                  showLiteral={showLiteral[translation.id] || false}
                  onToggleSelect={() => onToggleSelect(translation.id)}
                  onToggleLiteral={() => onToggleLiteral(translation.id, translation.source_lang, translation.target_lang)}
                  onDelete={() => onDelete(translation.id)}
                  onCopy={onCopy}
                  onSpeak={onSpeak}
                  onTextSelect={onTextSelect}
                  onFeedback={(type) => onFeedback(translation, type)}
                  noRomanization={noRomanizationLangs.includes(translation.source_lang) && noRomanizationLangs.includes(translation.target_lang)}
                  t={t}
                />
              ))
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}