import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  user: AuthUser | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = (email: string, pass: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setIsAuthenticating(true);
      setTimeout(() => {
        if (email && pass) {
          const normalizedEmail = email.trim().toLowerCase();
          setUser({
            id: normalizedEmail || 'demo-user',
            email: normalizedEmail || 'demo-user@local',
          });
          setIsAuthenticated(true);
          setIsAuthenticating(false);
          resolve();
        } else {
          setIsAuthenticating(false);
          reject(new Error('Invalid credentials'));
        }
      }, 800);
    });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAuthenticating, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
