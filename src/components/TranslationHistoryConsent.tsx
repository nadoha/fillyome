import { useTranslation } from "react-i18next";
import { History, Star, BookOpen, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TranslationHistoryConsentProps {
  open: boolean;
  onConsent: (agreed: boolean) => void;
}

export const TranslationHistoryConsent = ({
  open,
  onConsent,
}: TranslationHistoryConsentProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const benefits = [
    {
      icon: History,
      text: t("historyConsentBenefit1") || "이전 번역을 빠르게 확인",
    },
    {
      icon: BookOpen,
      text: t("historyConsentBenefit2") || "맞춤 학습 문제 제공",
    },
    {
      icon: Star,
      text: t("historyConsentBenefit3") || "즐겨찾기 기능 사용",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {t("historyConsentTitle") || "번역 기록을 저장할까요?"}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {t("historyConsentDesc") ||
              "번역 기록을 저장하면 이전 번역을 빠르게 확인하고 학습에 활용할 수 있어요."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <benefit.icon className="h-4 w-4" />
              </div>
              <span className="text-sm">{benefit.text}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => onConsent(true)} className="w-full">
            {t("enableSaving") || "저장하기"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onConsent(false)}
            className="w-full text-muted-foreground"
          >
            {t("maybeLater") || "나중에"}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1 pt-2 text-xs text-muted-foreground">
          <Settings className="h-3 w-3" />
          <button
            onClick={() => {
              onConsent(false);
              navigate("/settings");
            }}
            className="hover:underline"
          >
            {t("canChangeInSettings") || "설정에서 언제든 변경할 수 있어요"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
