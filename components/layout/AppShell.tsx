import React, { useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PenSquare, Home, Lightbulb, FileText, Settings, LogOut, Menu, X, User } from 'lucide-react';

interface NavItemProps {
  icon: React.ElementType;
  text: string;
  href: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, text, href }) => {
  const location = useLocation();
  const active = location.pathname === href;
  return (
    <Link
      to={href}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
        active
          ? 'text-white bg-gradient-to-r from-[#03C75A] to-[#00a043] shadow-md'
          : 'text-gray-600 hover:bg-gray-100 hover:text-[#03C75A]'
      }`}
    >
      <Icon className="mr-3 h-5 w-5" />
      <span>{text}</span>
    </Link>
  );
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { icon: Home, text: '홈', href: '/app' },
    { icon: Lightbulb, text: '키워드 추천', href: '/app' },
    { icon: FileText, text: '가이드 생성', href: '/app' },
    { icon: Settings, text: '설정', href: '/app/settings' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
        <div className="px-6 py-6 flex items-center gap-3 border-b border-gray-200 bg-gradient-to-r from-white to-green-50">
            <div className="bg-gradient-to-br from-[#03C75A] to-[#00a043] p-2.5 rounded-lg shadow-md">
              <PenSquare className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-[#03C75A] to-[#00a043] bg-clip-text text-transparent">우리의 블로그</h1>
              <p className="text-xs text-gray-500">블로그 마케팅 솔루션</p>
            </div>
        </div>
      <nav className="flex-1 px-3 py-6 space-y-2">
        {navItems.map((item) => (
          <NavItem key={item.text} {...item} />
        ))}
      </nav>
    </div>
  );

  return (
    <div className="h-full flex">
      {/* Mobile sidebar */}
      {sidebarOpen && (
         <div className="fixed inset-0 flex z-40 lg:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                        type="button"
                        className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <span className="sr-only">Close sidebar</span>
                        <X className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                </div>
                {sidebarContent}
            </div>
            <div className="flex-shrink-0 w-14"></div>
        </div>
      )}

      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 border-r border-gray-200 bg-white shadow-sm">
          {sidebarContent}
        </div>
      </div>
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow-md border-b border-gray-200">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 lg:hidden hover:bg-gray-50"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-end">
            <div className="ml-4 flex items-center md:ml-6">
              {user && (
                <div className="hidden sm:flex items-center gap-3 mr-4 px-4 py-2 rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="p-2 rounded-full bg-green-50 text-green-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{user.email}</p>
                    <p className="text-xs text-gray-500">ID: {user.id}</p>
                  </div>
                </div>
              )}
               <div className="ml-3 relative">
                 <button 
                   onClick={handleLogout} 
                   className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#03C75A] to-[#00a043] rounded-lg hover:shadow-md transition-all"
                 >
                    <LogOut className="mr-2 h-5 w-5"/>
                    로그아웃
                 </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 relative overflow-y-auto focus:outline-none bg-gradient-to-br from-white via-green-50 to-white">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
