import React, { useEffect } from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface SystemNotificationProps {
  title: string;
  message: string;
  onClose: () => void;
}

const SystemNotification: React.FC<SystemNotificationProps> = ({ title, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[100] w-80 bg-white/95 backdrop-blur-md border border-zinc-200 shadow-xl rounded-lg p-4 flex items-start gap-3 animate-in slide-in-from-right duration-300">
      <div className="bg-zinc-100 p-2 rounded-full shrink-0">
        <ShieldAlert className="w-5 h-5 text-zinc-700" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-zinc-900">{title}</h4>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed break-words">{message}</p>
      </div>
      <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SystemNotification;