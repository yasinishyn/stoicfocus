
import React from 'react';
import { Square, Scroll } from 'lucide-react';

interface ContentScriptButtonProps {
  onBlock: () => void;
  alertState?: boolean;
}

const ContentScriptButton: React.FC<ContentScriptButtonProps> = ({ onBlock, alertState }) => {
  return (
    <div className="absolute bottom-6 right-6 z-50 group">
      <button 
        onClick={onBlock}
        className={`flex items-center gap-2 px-3 py-2 rounded-sm shadow-lg transition-all duration-300 active:scale-95 border border-white/10 ${alertState ? 'bg-red-600 animate-pulse' : 'bg-zinc-900 hover:bg-red-600'}`}
      >
        {alertState ? <Scroll className="w-3 h-3 text-white" /> : <Square fill="currentColor" className="w-3 h-3 text-white" />}
        <span className={`transition-all duration-300 text-xs font-bold font-mono whitespace-nowrap text-white ${alertState ? 'max-w-xs' : 'max-w-0 overflow-hidden group-hover:max-w-xs'}`}>
          {alertState ? 'DOOM SCROLL DETECTED' : 'BLOCK SITE'}
        </span>
      </button>
      <div className="absolute top-full mt-2 right-0 text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-mono">
        {alertState ? 'Return to purpose' : 'StoicFocus Action'}
      </div>
    </div>
  );
};

export default ContentScriptButton;