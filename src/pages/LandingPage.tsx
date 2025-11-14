import React from 'react';
import { Link } from 'react-router-dom';
import { PenSquare, ChevronRight, Sparkles, Zap, BarChart3 } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-white via-green-50 to-white">
      {/* Header */}
      <header className="py-4 px-4 sm:px-6 lg:px-8 border-b border-gray-200 bg-white backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#03C75A] to-[#00a043] p-2 rounded-lg shadow-md">
              <PenSquare className="text-white h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#03C75A] to-[#00a043] bg-clip-text text-transparent">우리의 블로그</h1>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-[#03C75A] transition-colors">기능</a>
            <Link to="/auth/login" className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#03C75A] to-[#00a043] rounded-lg hover:shadow-lg transition-all">
              로그인
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-grow flex items-center">
        <div className="container mx-auto text-center px-4 py-20">
          <div className="mb-8 inline-block">
            <span className="text-sm font-semibold text-[#03C75A] bg-green-100 px-4 py-2 rounded-full">✨ AI 기반 블로그 마케팅</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            체험단 마케팅,<br />
            <span className="bg-gradient-to-r from-[#03C75A] to-[#00a043] bg-clip-text text-transparent">AI로 간단하게</span>
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
            2줄 요약만 입력하면 저경쟁 키워드와 블로거 가이드를 한번에 생성합니다.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link 
              to="/auth/login" 
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-[#03C75A] to-[#00a043] hover:shadow-lg transition-all transform hover:scale-105"
            >
              시작하기
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
            <a 
              href="#features" 
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-[#03C75A] text-base font-medium rounded-lg text-[#03C75A] hover:bg-green-50 transition-colors"
            >
              자세히 보기
            </a>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 py-20 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">주요 기능</h3>
          <p className="text-gray-600 text-lg mb-12">AI로 블로그 마케팅을 간단하게</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-md border border-gray-200 hover:shadow-xl hover:border-[#03C75A] transition-all">
              <div className="inline-block p-4 bg-gradient-to-br from-[#03C75A] to-[#00a043] rounded-xl mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="text-white h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">AI 키워드 추천</h4>
              <p className="text-gray-600 text-sm">경쟁이 낮은 효과적인 키워드를 자동으로 추천</p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-md border border-gray-200 hover:shadow-xl hover:border-[#03C75A] transition-all">
              <div className="inline-block p-4 bg-gradient-to-br from-[#03C75A] to-[#00a043] rounded-xl mb-4 group-hover:scale-110 transition-transform">
                <Zap className="text-white h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">가이드라인 생성</h4>
              <p className="text-gray-600 text-sm">선택된 키워드로 블로그 포스팅 가이드 즉시 생성</p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-md border border-gray-200 hover:shadow-xl hover:border-[#03C75A] transition-all">
              <div className="inline-block p-4 bg-gradient-to-br from-[#03C75A] to-[#00a043] rounded-xl mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="text-white h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">캠페인 관리</h4>
              <p className="text-gray-600 text-sm">(출시 예정) 캠페인 관리 및 성과 추적</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#03C75A] to-[#00a043] text-white py-16">
        <div className="container mx-auto text-center px-4">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">지금 시작하세요</h3>
          <p className="text-white/90 text-lg mb-8">AI로 블로그 마케팅을 쉽게 관리하세요</p>
          <Link 
            to="/auth/login" 
            className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white hover:text-[#03C75A] transition-all"
          >
            시작하기
            <ChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="container mx-auto text-center px-4 text-gray-600 text-sm">
          <p>&copy; 2025 우리의 블로그. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
