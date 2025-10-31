import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const AuthHeader = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(t("logoutSuccess") || "로그아웃되었습니다");
      setUser(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="w-full">
      {user ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border-2 border-border">
            <div className="rounded-full bg-primary/10 p-2">
              <UserIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">로그인됨</p>
              <p className="text-sm font-semibold truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={handleLogout}
            className="w-full gap-2 h-12 text-base border-2"
          >
            <LogOut className="w-5 h-5" />
            {t("logout") || "로그아웃"}
          </Button>
        </div>
      ) : (
        <Button
          variant="default"
          size="lg"
          onClick={() => navigate("/auth")}
          className="w-full gap-2 h-12 text-base shadow-lg hover:shadow-xl transition-all"
        >
          <LogIn className="w-5 h-5" />
          {t("login") || "로그인"}
        </Button>
      )}
    </div>
  );
};
