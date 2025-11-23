import { Trash2, History, Star, BookMarked } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecentTranslationItem } from "./RecentTranslationItem";
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
  onToggleFavorite: (id: string) => void;
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
  onToggleFavorite,
  onDelete,
  onBulkDelete,
  onCopy,
  onSpeak,
  onTextSelect,
  onFeedback,
  noRomanizationLangs
}: AppSidebarProps) {
  const {
    t
  } = useTranslation();
  const {
    open
  } = useSidebar();
  const navigate = useNavigate();
  const favoriteTranslations = recentTranslations.filter(t => t.is_favorite);
  const allTranslations = recentTranslations;
  return <Sidebar collapsible="offcanvas" className="border-r bg-card/95 backdrop-blur-sm shadow-xl z-50">
      <SidebarHeader className="border-b px-4 py-4 bg-gradient-to-br from-primary/5 to-primary/10">
        {open ? <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold tracking-normal">{t("translationHistory")}</h2>
                <p className="text-xs text-muted-foreground tracking-normal">{t("max50")}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/vocabulary")} className="w-full justify-start tracking-normal">
              <BookMarked className="h-4 w-4 mr-2" />
              나의 단어장
            </Button>
          </div> : <div className="flex justify-center py-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <History className="h-5 w-5 text-primary" />
            </div>
          </div>}
      </SidebarHeader>

      <SidebarContent className="px-4 py-4">
        <div className="space-y-4">
          {selectedIds.size > 0 && <div className="flex gap-2 animate-fade-in">
              <Button variant="outline" size="sm" onClick={() => {
            const allIds = new Set(recentTranslations.map(t => t.id));
            if (selectedIds.size === allIds.size) {
              recentTranslations.forEach(t => onToggleSelect(t.id));
            } else {
              allIds.forEach(id => {
                if (!selectedIds.has(id)) {
                  onToggleSelect(id);
                }
              });
            }
          }} className="flex-1 tracking-normal">
                {selectedIds.size === recentTranslations.length ? t("deselectAll") || "전체 해제" : t("selectAll") || "전체 선택"}
              </Button>
              <Button variant="destructive" size="sm" onClick={onBulkDelete} className="flex-1 tracking-normal">
                <Trash2 className="h-4 w-4 mr-2" />
                {t("deleteSelected")} ({selectedIds.size})
              </Button>
            </div>}
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="all" className="text-xs tracking-normal">
              <History className="h-3.5 w-3.5 mr-1.5" />
              {t("all")}
            </TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs tracking-normal">
              <Star className="h-3.5 w-3.5 mr-1.5" />
              {t("favorites")}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <SidebarGroup>
              <SidebarGroupContent className="space-y-2">
                {allTranslations.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8 tracking-normal">
                    {t("noHistory")}
                  </p> : allTranslations.map(translation => <RecentTranslationItem key={translation.id} translation={translation} isSelected={selectedIds.has(translation.id)} showLiteral={showLiteral[translation.id] || false} onToggleSelect={() => onToggleSelect(translation.id)} onToggleLiteral={() => onToggleLiteral(translation.id, translation.source_lang, translation.target_lang)} onToggleFavorite={() => onToggleFavorite(translation.id)} onDelete={() => onDelete(translation.id)} onCopy={onCopy} onSpeak={onSpeak} onTextSelect={onTextSelect} onFeedback={type => onFeedback(translation, type)} noRomanization={noRomanizationLangs.includes(translation.source_lang) && noRomanizationLangs.includes(translation.target_lang)} t={t} />)}
              </SidebarGroupContent>
            </SidebarGroup>
          </TabsContent>
          
          <TabsContent value="favorites" className="mt-0">
            <SidebarGroup>
              <SidebarGroupContent className="space-y-2">
                {favoriteTranslations.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8 tracking-normal">
                    {t("noFavorites")}
                  </p> : favoriteTranslations.map(translation => <RecentTranslationItem key={translation.id} translation={translation} isSelected={selectedIds.has(translation.id)} showLiteral={showLiteral[translation.id] || false} onToggleSelect={() => onToggleSelect(translation.id)} onToggleLiteral={() => onToggleLiteral(translation.id, translation.source_lang, translation.target_lang)} onToggleFavorite={() => onToggleFavorite(translation.id)} onDelete={() => onDelete(translation.id)} onCopy={onCopy} onSpeak={onSpeak} onTextSelect={onTextSelect} onFeedback={type => onFeedback(translation, type)} noRomanization={noRomanizationLangs.includes(translation.source_lang) && noRomanizationLangs.includes(translation.target_lang)} t={t} />)}
              </SidebarGroupContent>
            </SidebarGroup>
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>;
}