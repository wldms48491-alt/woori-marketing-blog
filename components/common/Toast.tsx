import React from 'react';
import { Info } from 'lucide-react';

interface ToastProps {
  message: string;
}

const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div className="fixed top-5 right-5 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 z-50 animate-fade-in-down">
      <Info className="h-5 w-5" />
      <span>{message}</span>
      <style>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;
