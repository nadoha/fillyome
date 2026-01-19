import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Globe, Database, UserCheck, Trash2, Mail } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      {/* Header */}
      <header className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="-ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">개인정보 처리방침</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 py-6 space-y-6 max-w-2xl mx-auto w-full">
        {/* Introduction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              개요
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            본 개인정보 처리방침은 번역 서비스 이용 시 수집되는 정보와 
            그 처리 방법에 대해 안내합니다. 
            본 서비스는 개인정보보호법(PIPA)을 준수합니다.
          </CardContent>
        </Card>

        {/* Data Collection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              수집하는 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div>
              <h4 className="font-medium mb-2">필수 정보</h4>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>번역 요청 텍스트 (서비스 제공 목적)</li>
                <li>이미지 번역 시 업로드된 이미지</li>
                <li>언어 설정 및 번역 스타일 선호도</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">선택 정보 (로그인 시)</h4>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>Google 계정 이메일 및 프로필</li>
                <li>번역 기록 (설정에서 저장 비활성화 가능)</li>
                <li>단어장 및 학습 기록</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* External Services */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              외부 AI 서비스 이용
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              더 정확한 번역을 위해 입력하신 텍스트와 이미지가 
              외부 AI 서비스로 전송됩니다.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-medium">Google Gemini</h4>
                <p className="text-muted-foreground text-xs mt-1">
                  텍스트 번역, 이미지 번역, 사전 검색, 학습 문제 생성
                </p>
              </div>
              <div>
                <h4 className="font-medium">OpenAI TTS</h4>
                <p className="text-muted-foreground text-xs mt-1">
                  번역 결과 음성 합성 (발음 듣기 기능)
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• 모든 통신은 HTTPS로 암호화됩니다</p>
              <p>• 번역 요청 데이터는 서비스 제공 후 AI 제공자 측에서 자동 삭제됩니다</p>
              <p>• 부적절한 콘텐츠는 필터링되어 전송되지 않습니다</p>
            </div>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              데이터 보안
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <p>• 모든 데이터는 암호화되어 저장 및 전송됩니다</p>
            <p>• 사용자 인증은 Google OAuth 2.0을 사용합니다</p>
            <p>• 비밀번호는 저장하지 않습니다</p>
            <p>• 데이터베이스 접근은 행 수준 보안(RLS)으로 보호됩니다</p>
            <p>• 번역 기록 저장 여부를 설정에서 직접 선택할 수 있습니다</p>
          </CardContent>
        </Card>

        {/* User Rights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              사용자 권리
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <p>• 설정에서 번역 기록 저장 기능을 끄거나 켤 수 있습니다</p>
            <p>• 설정에서 저장된 번역 기록을 삭제할 수 있습니다</p>
            <p>• 단어장 및 학습 데이터를 개별 삭제할 수 있습니다</p>
            <p>• 계정 연결 없이 익명으로 서비스를 이용할 수 있습니다</p>
          </CardContent>
        </Card>

        {/* Data Deletion */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-primary" />
              데이터 삭제
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <p>• 번역 기록: 설정 → 데이터 → 번역 기록 삭제</p>
            <p>• 캐시 데이터: 설정 → 데이터 → 캐시 비우기</p>
            <p>• 모든 데이터 삭제 요청: 아래 연락처로 문의</p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              문의
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            개인정보 처리에 관한 문의사항이 있으시면 
            설정 페이지의 피드백 기능을 이용해 주세요.
          </CardContent>
        </Card>

        {/* Last Updated */}
        <p className="text-xs text-muted-foreground text-center pt-4">
          최종 수정일: 2025년 1월 19일
        </p>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Privacy;
