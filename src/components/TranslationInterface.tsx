import { useState, useEffect } from "react";
import { ArrowLeftRight, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export const TranslationInterface = () => {
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sourceLang, setSourceLang] = useState<"ko" | "ja">("ko");
  const [targetLang, setTargetLang] = useState<"ko" | "ja">("ja");
  const [isTranslating, setIsTranslating] = useState(false);
  const [recentTranslations, setRecentTranslations] = useState<Translation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLiteral, setShowLiteral] = useState<Record<string, boolean>>({});

  // Fetch recent translations on mount
  useEffect(() => {
    fetchRecentTranslations();
  }, []);

  const fetchRecentTranslations = async () => {
    const { data, error } = await supabase
      .from("translations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error fetching translations:", error);
    } else if (data) {
      setRecentTranslations(data);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(targetText);
    setTargetText("");
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast.error("Please enter text to translate");
      return;
    }

    setIsTranslating(true);

    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: {
          text: sourceText,
          sourceLang,
          targetLang,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const translation = data.translation;
      const literalTranslation = data.literalTranslation || "";
      const sourceRomanization = data.sourceRomanization || "";
      const targetRomanization = data.targetRomanization || "";
      
      setTargetText(translation);

      // Auto-save to database
      const { error: insertError } = await supabase
        .from("translations")
        .insert({
          source_text: sourceText,
          target_text: translation,
          source_lang: sourceLang,
          target_lang: targetLang,
          is_favorite: false,
          source_romanization: sourceRomanization,
          target_romanization: targetRomanization,
          literal_translation: literalTranslation,
        });

      if (insertError) {
        console.error("Error saving translation:", insertError);
        toast.error("Translation succeeded but failed to save history");
      } else {
        // Refresh recent translations
        fetchRecentTranslations();
      }
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    const { error } = await supabase
      .from("translations")
      .update({ is_favorite: !currentFavorite })
      .eq("id", id);

    if (error) {
      console.error("Error updating favorite:", error);
      toast.error("Failed to update favorite");
    } else {
      toast.success(currentFavorite ? "Removed from favorites" : "Added to favorites");
      fetchRecentTranslations();
    }
  };

  const getLangLabel = (lang: string) => {
    return lang === "ko" ? "한국어" : "日本語";
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("translations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting translation:", error);
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted");
      fetchRecentTranslations();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const { error } = await supabase
      .from("translations")
      .delete()
      .in("id", Array.from(selectedIds));

    if (error) {
      console.error("Error deleting translations:", error);
      toast.error("Failed to delete selected items");
    } else {
      toast.success(`Deleted ${selectedIds.size} items`);
      setSelectedIds(new Set());
      fetchRecentTranslations();
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleLiteral = (id: string) => {
    setShowLiteral(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Translation Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl space-y-6">
          {/* Language Selector */}
          <div className="flex items-center justify-center gap-4">
            <div className="px-4 py-2 rounded-lg bg-card border border-border">
              <span className="text-lg font-medium text-foreground">
                {getLangLabel(sourceLang)}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={swapLanguages}
              className="rounded-full h-10 w-10 hover:rotate-180 transition-transform duration-300"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            
            <div className="px-4 py-2 rounded-lg bg-card border border-border">
              <span className="text-lg font-medium text-foreground">
                {getLangLabel(targetLang)}
              </span>
            </div>
          </div>

          {/* Translation Boxes */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Source Text */}
            <div className="space-y-2">
              <Textarea
                placeholder="Enter text to translate..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="min-h-[200px] resize-none text-base"
                autoFocus
              />
            </div>

            {/* Target Text */}
            <div className="space-y-2">
              <Textarea
                placeholder="Translation will appear here..."
                value={targetText}
                readOnly
                className="min-h-[200px] resize-none text-base bg-muted"
              />
            </div>
          </div>

          {/* Translate Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleTranslate}
              disabled={isTranslating || !sourceText.trim()}
              size="lg"
              className="px-8"
            >
              {isTranslating ? "Translating..." : "Translate"}
            </Button>
          </div>
        </div>
      </main>

      {/* Recent Translations - Minimal Display */}
      {recentTranslations.length > 0 && (
        <aside className="border-t border-border bg-card">
          <div className="max-w-4xl mx-auto p-4 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Recent</h3>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-8"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete ({selectedIds.size})
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {recentTranslations.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors group"
                >
                  <Checkbox
                    checked={selectedIds.has(t.id)}
                    onCheckedChange={() => toggleSelect(t.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{getLangLabel(t.source_lang)}</span>
                      <span>→</span>
                      <span>{getLangLabel(t.target_lang)}</span>
                    </div>
                    <p className="text-sm text-foreground truncate">{t.source_text}</p>
                    {t.source_romanization && (
                      <p className="text-xs text-muted-foreground/70 italic truncate">{t.source_romanization}</p>
                    )}
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-muted-foreground truncate">{t.target_text}</p>
                      {t.target_romanization && (
                        <p className="text-xs text-muted-foreground/70 italic truncate">{t.target_romanization}</p>
                      )}
                      {t.literal_translation && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLiteral(t.id)}
                            className="h-6 px-2 text-xs"
                          >
                            {showLiteral[t.id] ? "Hide" : "Show"} Literal translation
                          </Button>
                          {showLiteral[t.id] && (
                            <div className="pl-3 border-l-2 border-border">
                              <p className="text-xs text-muted-foreground/90 italic">
                                Literal: {t.literal_translation}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleFavorite(t.id, t.is_favorite)}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          t.is_favorite
                            ? "fill-accent text-accent"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
