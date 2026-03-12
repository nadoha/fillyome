import { useState, useEffect } from "react";
import { ArrowLeft, Volume2, Mic, Database, Globe, Trash2, User, LogOut, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { cleanAllCaches, getCacheStats, clearTranslationCache } from "@/utils/cacheManager";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  const [saveTranslationHistory, setSaveTranslationHistory] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  
  const [noiseCancellation, setNoiseCancellation] = useState(() => {
    const saved = localStorage.getItem('noiseCancellation');
    return saved ? JSON.parse(saved) : true;
  });
  const [autoSave, setAutoSave] = useState(() => {
    const saved = localStorage.getItem('autoSave');
    return saved ? JSON.parse(saved) : true;
  });
  const [soundEffects, setSoundEffects] = useState(() => {
    const saved = localStorage.getItem('soundEffects');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    const loadUserAndSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoadingUser(false);
      
      if (user) {
        const { data: settings } = await supabase
          .from("learning_settings")
          .select("save_translation_history")
          .eq("user_id", user.id)
          .maybeSingle();
        
        setSaveTranslationHistory(settings?.save_translation_history ?? false);
      }
    };
    
    loadUserAndSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const { data: settings } = await supabase
            .from("learning_settings")
            .select("save_translation_history")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          setSaveTranslationHistory(settings?.save_translation_history ?? false);
        }, 0);
      } else {
        setSaveTranslationHistory(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNoiseCancellation = (checked: boolean) => {
    setNoiseCancellation(checked);
    localStorage.setItem('noiseCancellation', JSON.stringify(checked));
    toast.success(checked ? t("noiseCancelOn") : t("noiseCancelOff"));
  };

  const handleSaveTranslationHistory = async (checked: boolean) => {
    if (!user) return;
    
    setIsLoadingSettings(true);
    try {
      const { data: existing } = await supabase
        .from("learning_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from("learning_settings")
          .update({ save_translation_history: checked })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("learning_settings")
          .insert({ 
            user_id: user.id, 
            save_translation_history: checked 
          });
      }
      
      setSaveTranslationHistory(checked);
      toast.success(checked ? t("translationHistoryEnabled") : t("translationHistoryDisabled"));
    } catch (error) {
      console.error("Failed to update setting:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleAutoSave = (checked: boolean) => {
    setAutoSave(checked);
    localStorage.setItem('autoSave', JSON.stringify(checked));
    toast.success(checked ? t("autoSaveOn") : t("autoSaveOff"));
  };

  const handleSoundEffects = (checked: boolean) => {
    setSoundEffects(checked);
    localStorage.setItem('soundEffects', JSON.stringify(checked));
    toast.success(checked ? t("soundOn") : t("soundOff"));
  };

  const clearCache = () => {
    const count = clearTranslationCache();
    toast.success(t("cachesDeleted", { count }));
  };

  const optimizeCache = () => {
    cleanAllCaches();
    const stats = getCacheStats();
    toast.success(t("cacheOptimized", { count: stats.total }));
  };

  const clearHistory = () => {
    localStorage.removeItem('translations');
    toast.success(t("historyCleared"));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("logoutSuccess"));
  };

  return (
    <>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <header className="border-b bg-background sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-5 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="-ml-2"
                aria-label={t("goBack")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">{t("settings")}</h1>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 py-6 space-y-6">
          {/* Account Section */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("accountSection")}</h2>
            <Card className="border-border shadow-none">
              <CardContent className="p-0">
                {isLoadingUser ? (
                  <div className="p-4 text-sm text-muted-foreground">{t("loadingText")}</div>
                ) : user ? (
                  <>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.email}</p>
                          <p className="text-xs text-muted-foreground">{t("googleAccountLinked")}</p>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 px-4 text-sm text-muted-foreground hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      {t("logout")}
                    </Button>
                  </>
                ) : (
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate("/auth")}
                  >
                    <div>
                      <p className="text-sm font-medium">{t("googleAccountLinkOptional")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("googleAccountLinkDesc")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Voice Settings */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("voiceSection")}</h2>
            <Card className="border-border shadow-none">
              <CardContent className="p-0">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("noiseCancellation")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("noiseCancelDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={noiseCancellation}
                    onCheckedChange={handleNoiseCancellation}
                  />
                </div>
                <Separator />
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("soundEffects")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("soundEffectsDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={soundEffects}
                    onCheckedChange={handleSoundEffects}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Data Settings */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("dataSection")}</h2>
            <Card className="border-border shadow-none">
              <CardContent className="p-0">
                {user && (
                  <>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t("translationHistorySaveLabel")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("translationHistorySaveDesc")}
                        </p>
                      </div>
                      <Switch
                        checked={saveTranslationHistory}
                        onCheckedChange={handleSaveTranslationHistory}
                        disabled={isLoadingSettings}
                      />
                    </div>
                    <Separator />
                  </>
                )}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("autoSaveLocal")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("autoSaveLocalDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={autoSave}
                    onCheckedChange={handleAutoSave}
                  />
                </div>
                <Separator />
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 px-4 text-sm"
                  onClick={optimizeCache}
                >
                  {t("cacheOptimize")}
                </Button>
                <Separator />
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 px-4 text-sm"
                  onClick={clearCache}
                >
                  {t("translateCacheDelete")}
                </Button>
                <Separator />
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 px-4 text-sm text-destructive hover:text-destructive"
                  onClick={clearHistory}
                >
                  {t("translateHistoryDelete")}
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Language Settings */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("languageSection")}</h2>
            <Card className="border-border shadow-none">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">{t("appDisplayLanguage")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {["ko", "ja", "en", "zh"].map((lang) => (
                    <Button
                      key={lang}
                      variant={i18n.language === lang ? "default" : "outline"}
                      size="sm"
                      className="h-10"
                      onClick={() => {
                        i18n.changeLanguage(lang);
                        toast.success(t("languageChanged"));
                      }}
                    >
                      {lang === "ko" && "한국어"}
                      {lang === "ja" && "日本語"}
                      {lang === "en" && "English"}
                      {lang === "zh" && "中文"}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Privacy Policy Link */}
          <section>
            <Card className="border-border shadow-none">
              <CardContent className="p-0">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate("/privacy")}
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{t("privacyPolicy")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Privacy notice */}
          <p className="text-xs text-muted-foreground text-center pt-2 leading-relaxed">
            {t("privacyNotice")}
          </p>
        </main>
      </div>
      <BottomNavigation />
    </>
  );
}