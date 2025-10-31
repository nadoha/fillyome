import { Trash2, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { RecentTranslationItem } from "./RecentTranslationItem";
import { ThemeToggle } from "./ThemeToggle";
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
  onSpeak: (text: string, lang: string) => void;
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
  noRomanizationLangs,
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { open } = useSidebar();

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          {open && (
            <div className="flex-1">
              <h2 className="text-sm font-semibold">번역 기록</h2>
              <p className="text-xs text-muted-foreground">최대 50개</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {selectedIds.size > 0 && open && (
            <div className="px-4 pb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkDelete}
                className="w-full h-8 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                {t("bulkDelete")} ({selectedIds.size})
              </Button>
            </div>
          )}

          <SidebarGroupContent>
            {recentTranslations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                {open && (
                  <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1 px-2">
                {recentTranslations.map((translation, index) => (
                  <div 
                    key={translation.id}
                    style={{ animationDelay: `${index * 30}ms` }}
                    className="animate-fade-in"
                  >
                    <RecentTranslationItem
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
                  </div>
                ))}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3">
        {open ? (
          <div className="space-y-3">
            <AuthHeader />
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <ThemeToggle />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
