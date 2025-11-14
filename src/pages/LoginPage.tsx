import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PenSquare, Mail, Lock, Loader } from 'lucide-react';
import Toast from '../../components/common/Toast';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const { login, isAuthenticating } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    }
  };
  
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-green-50 to-white px-4">
      {toastMessage && <Toast message={toastMessage} />}
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link to="/" className="flex items-center justify-center gap-3">
            <div className="bg-gradient-to-br from-[#03C75A] to-[#00a043] p-3 rounded-xl shadow-lg">
              <PenSquare className="text-white h-8 w-8" />
            </div>
          </Link>
          <h2 className="mt-6 text-center text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-[#03C75A] to-[#00a043] bg-clip-text text-transparent">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            우리의 블로그에 로그인하세요
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-semibold text-gray-800 mb-2">
                이메일
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#03C75A] focus:border-transparent transition-all sm:text-sm"
                  placeholder="이메일 주소 입력"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#03C75A] focus:border-transparent transition-all sm:text-sm"
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg">{error}</p>}

          <div className="flex items-center justify-end">
            <div className="text-sm">
              <a href="#" onClick={() => showToast('준비 중입니다.')} className="font-medium text-[#03C75A] hover:text-[#00a043] transition-colors">
                비밀번호 재설정
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isAuthenticating}
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-[#03C75A] to-[#00a043] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAuthenticating ? (
                <Loader className="animate-spin h-5 w-5 text-white" />
              ) : (
                '로그인'
              )}
            </button>
          </div>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gradient-to-br from-white via-green-50 to-white text-gray-500">또는</span>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={() => showToast('준비 중입니다.')}
            className="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            Google로 로그인
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
