import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mic, Volume2, Waves, CheckCircle2 } from "lucide-react";

interface VoiceInputOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const VoiceInputOnboarding = ({
  open,
  onOpenChange,
  onComplete,
}: VoiceInputOnboardingProps) => {
  const handleComplete = () => {
    localStorage.setItem("voiceInputOnboardingShown", "true");
    onComplete();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Mic className="h-6 w-6 text-primary" />
            음성 입력 사용 가이드
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="mt-1 p-2 rounded-lg bg-primary/10">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">
                    1. 마이크 허용
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    처음 사용 시 브라우저에서 마이크 접근 권한을 요청합니다. 
                    "허용"을 눌러주세요.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="mt-1 p-2 rounded-lg bg-primary/10">
                  <Volume2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">
                    2. 적절한 거리 유지
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    마이크로부터 15-30cm 거리에서 명확하게 발음해주세요.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="mt-1 p-2 rounded-lg bg-primary/10">
                  <Waves className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">
                    3. 파형으로 상태 확인
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    음성 인식 중에는 파형 애니메이션과 실시간 레벨이 표시됩니다.
                    목소리가 감지되면 녹색 표시가 나타납니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="mt-1 p-2 rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">
                    4. 노이즈 캔슬링
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    배경 소음이 많은 환경에서는 필터 버튼으로 노이즈 캔슬링을 
                    활성화하세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground">
                💡 <strong>팁:</strong> 조용한 환경에서 사용하면 인식 정확도가 높아집니다.
                여러 언어를 사용하면 자동으로 언어가 전환됩니다.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleComplete} className="w-full sm:w-auto">
            시작하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
