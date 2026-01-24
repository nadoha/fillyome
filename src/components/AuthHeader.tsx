import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import { LogIn, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AuthHeader = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Set up auth state listener FIRST (critical order for session persistence)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border-2 border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="rounded-full bg-primary/10 p-2">
                <UserIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs text-muted-foreground">로그인됨</p>
                <p className="text-sm font-semibold truncate">{user.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
              <LogOut className="w-4 h-4" />
              {t("logout") || "로그아웃"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
