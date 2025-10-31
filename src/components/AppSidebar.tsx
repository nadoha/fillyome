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
    <Sidebar className="border-r bg-card/50 backdrop-blur-sm">
      <SidebarHeader className="border-b px-3 py-4 space-y-3">
        {open ? (
          <div className="space-y-3 animate-fade-in">
            <AuthHeader />
            <div className="flex items-center gap-2 pt-2">
              <History className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h2 className="text-sm font-semibold">번역 기록</h2>
                <p className="text-xs text-muted-foreground">최대 50개</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-full flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {selectedIds.size > 0 && open && (
            <div className="px-2 pb-3 pt-2 animate-scale-in">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkDelete}
                className="w-full h-9 text-xs text-destructive hover:bg-destructive/10 border-2 border-destructive/20 hover:border-destructive/40 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                {t("bulkDelete")} ({selectedIds.size})
              </Button>
            </div>
          )}

          <SidebarGroupContent>
            {recentTranslations.length === 0 ? (
              <div className="px-4 py-12 text-center animate-fade-in">
                <div className="rounded-full bg-muted/50 w-20 h-20 mx-auto flex items-center justify-center mb-4">
                  <History className="h-10 w-10 text-muted-foreground/40" />
                </div>
                {open && (
                  <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
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

      <SidebarFooter className="border-t px-3 py-4 bg-muted/30">
        {open && (
          <div className="flex justify-center animate-fade-in">
            <ThemeToggle />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
