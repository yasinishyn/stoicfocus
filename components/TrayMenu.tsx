
import React, { useState, useEffect } from 'react';
import { Play, Pause, X, Settings, BrainCircuit, Zap, Ban, AlertTriangle, ScrollText } from 'lucide-react';
import { PomodoroState, AppSettings } from '../src/types';

interface ExtensionPopupProps {
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  currentDomain: string;
  onBlockCurrent: () => void;
  onOpenPage: (url: string) => void;
  pomo: PomodoroState;
  setPomo: React.Dispatch<React.SetStateAction<PomodoroState>>;
  setPreMortem: (reason: string) => void;
}

// Visual Chess Puzzle
interface ChessPuzzle {
  id: number;
  fen: string;
  question: string;
  options: string[];
  answer: string;
}

const PIECES: Record<string, string> = {
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙'
};

const MiniChessBoard: React.FC<{ fen: string }> = ({ fen }) => {
  const boardStr = fen.split(' ')[0];
  const rows = boardStr.split('/');
  const squares: string[] = [];

  rows.forEach(row => {
    for (const char of row) {
      if (isNaN(parseInt(char))) {
        squares.push(char);
      } else {
        const emptyCount = parseInt(char);
        for (let i = 0; i < emptyCount; i++) squares.push('');
      }
    }
  });

  return (
    <div className="grid grid-cols-8 grid-rows-[repeat(8,minmax(0,1fr))] border-2 border-zinc-900 w-full aspect-square bg-white">
      {squares.map((piece, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const isDark = (row + col) % 2 === 1;
        return (
          <div 
            key={i} 
            className={`flex items-center justify-center text-2xl cursor-default select-none w-full h-full ${isDark ? 'bg-zinc-300' : 'bg-white'}`}
          >
             <span className="text-zinc-900 leading-none">{PIECES[piece]}</span>
          </div>
        );
      })}
    </div>
  );
};

const PUZZLES: ChessPuzzle[] = [
  {
    id: 1,
    fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    question: "White to move. Mate in 1.",
    options: ["Qxf7#", "Bxf7+", "Qxe5+"],
    answer: "Qxf7#"
  },
  {
    id: 2,
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    question: "White to move. Mate in 1.",
    options: ["Re8#", "h3", "Kf1"],
    answer: "Re8#"
  },
  {
    id: 3,
    fen: "rn1qkbnr/pp3ppp/3p4/2p1N3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R w KQkq - 0 6",
    question: "White to move. Best move.",
    options: ["Bxf7+", "Nxg4", "h3"],
    answer: "Bxf7+"
  }
];

const ExtensionPopup: React.FC<ExtensionPopupProps> = ({ 
  onClose, 
  settings, 
  onUpdateSettings,
  currentDomain, 
  onBlockCurrent,
  onOpenPage,
  pomo,
  setPomo,
  setPreMortem
}) => {
  const [puzzle, setPuzzle] = useState<ChessPuzzle | null>(null);
  const [pendingAction, setPendingAction] = useState<'pause' | 'disable' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [view, setView] = useState<'main' | 'premortem'>('main');
  const [preMortemInput, setPreMortemInput] = useState('');

  const updatePomo = (updater: (p: PomodoroState) => PomodoroState) => {
    setPomo(prev => {
      const next = updater(prev);
      chrome.storage.local.set({ pomo: next }).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const ensureBaseline = (prev: PomodoroState): PomodoroState => {
    const mode = prev.mode || 'focus';
    const duration = (mode === 'focus' ? settings.focusDuration : settings.breakDuration) * 60;
    const timeLeft = typeof prev.timeLeft === 'number' && prev.timeLeft > 0 ? prev.timeLeft : duration;
    const preMortemCaptured = prev.preMortemCaptured ?? false;
    return { ...prev, mode, timeLeft, preMortemCaptured };
  };

  const handleStartFlow = () => {
    if (pomo.isActive) {
      // Pause logic
      if (settings.hardcoreMode) {
        const randomPuzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        setPuzzle(randomPuzzle);
        setPendingAction('pause');
      } else {
        updatePomo(prev => ({ ...ensureBaseline(prev), isActive: false }));
      }
    } else {
      // Start logic
      if (settings.negativeVisualization && !(pomo.preMortemCaptured ?? false)) {
        setView('premortem');
      } else {
        updatePomo(prev => {
          const baseline = ensureBaseline(prev);
          return { ...baseline, isActive: true };
        });
      }
    }
  };

  const confirmStart = () => {
    setPreMortem(preMortemInput);
    updatePomo(prev => {
      const baseline = ensureBaseline(prev);
      return { ...baseline, isActive: true, preMortemCaptured: true };
    });
    setView('main');
    setPreMortemInput('');
  };

  const handleDisableAttempt = () => {
     if (!settings.enabled) {
       onUpdateSettings({ ...settings, enabled: true });
     } else {
       if (settings.hardcoreMode) {
          const randomPuzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
          setPuzzle(randomPuzzle);
          setPendingAction('disable');
       } else {
          onUpdateSettings({ ...settings, enabled: false });
       }
     }
  };

  const handlePuzzleAnswer = (option: string) => {
    if (puzzle && option === puzzle.answer) {
      if (pendingAction === 'pause') {
         updatePomo(prev => ({ ...prev, isActive: false }));
      } else if (pendingAction === 'disable') {
         onUpdateSettings({ ...settings, enabled: false });
      }
      setPuzzle(null);
      setPendingAction(null);
    } else {
      setFeedback("STAY FOCUSED OR LEARN CHESS!!!");
      setPuzzle(null);
      setPendingAction(null);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalDuration = pomo.mode === 'focus' ? settings.focusDuration * 60 : settings.breakDuration * 60;
  const progress = ((totalDuration - pomo.timeLeft) / totalDuration) * 100;

  if (view === 'premortem') {
    return (
      <div className="w-[400px] bg-white border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] flex flex-col text-zinc-900 font-mono p-5">
         <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-1">Negative Visualization</h2>
            <p className="text-[10px] text-zinc-500">Premeditatio Malorum</p>
         </div>
         <p className="text-xs font-serif italic mb-4">"What is the most likely reason you will fail to focus during this session?"</p>
         <textarea 
            value={preMortemInput}
            onChange={(e) => setPreMortemInput(e.target.value)}
            className="w-full h-24 border-2 border-zinc-900 p-2 text-xs font-mono focus:outline-none mb-4 uppercase"
            placeholder="E.G. I WILL CHECK REDDIT..."
            autoFocus
         />
         <div className="flex gap-2">
            <button onClick={() => setView('main')} className="flex-1 py-2 border border-zinc-900 text-[10px] font-bold uppercase hover:bg-zinc-100">Cancel</button>
            <button onClick={confirmStart} className="flex-1 py-2 bg-zinc-900 text-white text-[10px] font-bold uppercase hover:bg-zinc-700">Begin Session</button>
         </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] bg-white border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] flex flex-col text-zinc-900 font-mono">
      {/* Header */}
      <div className="h-12 border-b-2 border-zinc-900 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 ${settings.enabled ? 'bg-zinc-900' : 'bg-zinc-400'}`}></div>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-900">StoicFocus</span>
        </div>
        <button onClick={onClose} className="hover:bg-zinc-100 p-1 transition-colors">
          <X className="w-4 h-4 text-zinc-900" />
        </button>
      </div>

      {/* Main Controls */}
      <div className="p-5 space-y-6">
        
        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">System Status</span>
            {settings.hardcoreMode && <span className="text-[10px] text-zinc-900 flex items-center gap-1 font-bold mt-0.5"><Zap className="w-3 h-3"/> HARDCORE FOCUS</span>}
          </div>
          <button 
            onClick={handleDisableAttempt}
            className={`w-10 h-6 border-2 border-zinc-900 p-0.5 transition-colors duration-0 ${settings.enabled ? 'bg-zinc-900' : 'bg-white'}`}
          >
            <div className={`w-4 h-4 border border-zinc-900 transform transition-transform duration-0 ${settings.enabled ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-900'}`} />
          </button>
        </div>

        {/* Pomodoro Timer / Feedback / Puzzle */}
        <div className="border-t-2 border-zinc-900 pt-5 relative">
          
          {feedback && (
            <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center text-center p-4 animate-in fade-in duration-200 z-10">
               <AlertTriangle className="w-8 h-8 text-white mb-2" />
               <p className="text-white font-bold text-sm uppercase tracking-widest">{feedback}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {pomo.mode === 'focus' ? 'Deep Work' : 'Rest Phase'}
            </span>
            <span className="text-xl font-bold text-zinc-900 tracking-tighter">{formatTime(pomo.timeLeft)}</span>
          </div>
          
          <div className="h-2 w-full border border-zinc-900 mb-5 p-0.5">
             <div 
              className="h-full bg-zinc-900 transition-all duration-1000 ease-linear" 
              style={{ width: `${progress}%` }}
             />
          </div>

          {/* CHESS PUZZLE OVERLAY or BUTTON */}
          {puzzle ? (
            <div className="bg-white border-2 border-zinc-900 p-3 animate-in fade-in duration-200">
               <div className="flex items-center gap-2 mb-2 border-b border-zinc-200 pb-2">
                 <BrainCircuit className="w-4 h-4 text-zinc-900" />
                 <span className="text-[10px] font-bold uppercase tracking-wide">
                   Verify Intent
                 </span>
               </div>
               
               {/* Visual Board */}
               <div className="mb-3 px-4">
                  <MiniChessBoard fen={puzzle.fen} />
               </div>

               <div className="text-[10px] text-zinc-600 mb-3 leading-relaxed text-center">
                 <div className="font-bold text-zinc-900">{puzzle.question}</div>
               </div>
               <div className="grid grid-cols-1 gap-2">
                  {puzzle.options.map(opt => (
                    <button 
                      key={opt}
                      onClick={() => handlePuzzleAnswer(opt)}
                      className="px-2 py-2 bg-white border border-zinc-900 hover:bg-zinc-900 hover:text-white text-xs font-bold uppercase transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
               </div>
            </div>
          ) : (
            <button 
              onClick={handleStartFlow}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest transition-all"
            >
              {pomo.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {pomo.isActive ? 'Pause' : 'Engage'}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-zinc-900 grid grid-cols-2 divide-x-2 divide-zinc-900">
        <button 
          onClick={() => onOpenPage('chrome://boundaries')}
          className="h-10 flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors text-zinc-900"
        >
          <Ban className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Dashboard</span>
        </button>
        <button 
          onClick={() => onOpenPage('chrome://boundaries#settings')}
          className="h-10 flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors text-zinc-900"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Config</span>
        </button>
      </div>
    </div>
  );
};

export default ExtensionPopup;