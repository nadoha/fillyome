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
  const {
    t
  } = useTranslation();
  const {
    open
  } = useSidebar();
  return <Sidebar className="border-r bg-card/50 backdrop-blur-sm" collapsible="icon">
      <SidebarHeader className="border-b px-4 py-6 bg-gradient-to-br from-primary/5 to-primary/10">
        {open ? <div className="space-y-4 animate-fade-in">
            <div className="w-full">
              <AuthHeader />
            </div>
          </div> : <div className="flex justify-center py-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <History className="h-5 w-5 text-primary" />
            </div>
          </div>}
      </SidebarHeader>

      <div className="px-4 py-3 border-b bg-muted/30">
        {open ? <div className="flex items-center gap-3 animate-fade-in">
            <div className="rounded-lg bg-primary/10 p-2">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">번역 기록</h2>
              <p className="text-xs text-muted-foreground">최대 50개</p>
            </div>
          </div> : <div className="flex flex-col items-center gap-1.5">
            <div className="rounded-lg bg-primary/10 p-2">
              <History className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground text-center leading-tight">번역<br />기록</p>
          </div>}
      </div>

      
    </Sidebar>;
}