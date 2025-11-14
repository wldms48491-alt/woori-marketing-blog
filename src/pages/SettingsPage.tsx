import React from 'react';
import AppShell from '../../components/layout/AppShell';
import { KeyRound, ShieldCheck } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <AppShell>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <KeyRound className="h-8 w-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">API 키 설정</h1>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md space-y-6">

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-green-600" />
                <span>API 키 관리</span>
              </h2>
              <p className="text-gray-600">
                Google Gemini API 키는 보안을 위해 서버 환경에 안전하게 설정되어 있습니다.
                이 애플리케이션은 서버에 미리 구성된 API 키를 사용하여 Google AI 서비스와 통신합니다.
              </p>
              <p className="text-gray-600 mt-2">
                API 키 관련 문제가 발생하거나 키를 변경해야 할 경우, 시스템 관리자에게 문의해주세요.
              </p>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 rounded-md">
                <p className="font-bold">참고:</p>
                <p>
                  사용자가 직접 API 키를 입력하거나 수정할 필요가 없습니다. 모든 인증은 백엔드에서 안전하게 처리됩니다.
                </p>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
};

export default SettingsPage;
