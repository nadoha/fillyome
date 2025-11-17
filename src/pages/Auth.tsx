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
  const [emailSent, setEmailSent] = useState(false);
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
        setEmailSent(true);
        toast.success(t("signupSuccess") || "회원가입 성공! 이메일을 확인해주세요.");
      }
    } catch (error: any) {
      toast.error(error.message || t("authError") || "인증 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-3 sm:p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 sm:space-y-4">
          <CardTitle className="text-xl sm:text-2xl">{isLogin ? (t("login") || "로그인") : (t("signup") || "회원가입")}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {emailSent 
              ? "이메일로 전송된 인증 링크를 클릭하여 회원가입을 완료해주세요."
              : isLogin 
                ? (t("loginDescription") || "계정에 로그인하여 번역 기록을 저장하세요")
                : (t("signupDescription") || "새 계정을 만들어 번역 기록을 저장하세요")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {emailSent ? (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-sm">
                  <strong>{email}</strong> 주소로 인증 이메일이 전송되었습니다.
                </p>
                <p className="text-xs mt-2 text-muted-foreground">
                  이메일을 확인하고 인증 링크를 클릭해주세요.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEmailSent(false);
                  setIsLogin(true);
                }}
              >
                로그인 페이지로 돌아가기
              </Button>
            </div>
          ) : (
          <>
            <form onSubmit={handleAuth} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">{t("email") || "이메일"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="h-11 sm:h-12 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base">{t("password") || "비밀번호"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 sm:h-12 text-base"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full h-11 sm:h-12 text-base" disabled={loading}>
                {loading ? t("loading") || "처리 중..." : isLogin ? (t("login") || "로그인") : (t("signup") || "회원가입")}
              </Button>
            </form>
            <div className="mt-4 sm:mt-6 text-center space-y-2">
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm sm:text-base h-auto"
              >
                {isLogin 
                  ? (t("needAccount") || "계정이 없으신가요? 회원가입")
                  : (t("haveAccount") || "이미 계정이 있으신가요? 로그인")}
              </Button>
              <Button
                variant="outline"
                className="w-full h-11 sm:h-12 text-base"
                onClick={() => navigate("/")}
              >
                {t("useWithoutLogin") || "로그인 없이 사용하기"}
              </Button>
            </div>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;