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
    <div className="flex items-center gap-2">
      {user ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50">
            <UserIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t("logout") || "로그아웃"}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/auth")}
          className="gap-2"
        >
          <LogIn className="w-4 h-4" />
          {t("login") || "로그인"}
        </Button>
      )}
    </div>
  );
};
