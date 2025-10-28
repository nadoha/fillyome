import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success(t("loginSuccess") || "로그인 성공!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success(t("signupSuccess") || "회원가입 성공! 로그인해주세요.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || t("authError") || "인증 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? (t("login") || "로그인") : (t("signup") || "회원가입")}</CardTitle>
          <CardDescription>
            {isLogin 
              ? (t("loginDescription") || "계정에 로그인하여 번역 기록을 저장하세요")
              : (t("signupDescription") || "새 계정을 만들어 번역 기록을 저장하세요")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email") || "이메일"}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password") || "비밀번호"}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("loading") || "처리 중..." : isLogin ? (t("login") || "로그인") : (t("signup") || "회원가입")}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin 
                ? (t("needAccount") || "계정이 없으신가요? 회원가입")
                : (t("haveAccount") || "이미 계정이 있으신가요? 로그인")}
            </Button>
          </div>
          <div className="mt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/")}
            >
              {t("useWithoutLogin") || "로그인 없이 사용하기"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;