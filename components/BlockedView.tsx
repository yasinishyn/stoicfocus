
import React, { useEffect, useState } from 'react';
import { getRandomQuote, getRandomText } from '../services/staticQuotes';
import { getStoicQuote } from '../services/geminiService';
import { Quote, AppSettings } from '../src/types';
import { ArrowLeft, Square, X, Layers } from 'lucide-react';

interface BlockedViewProps {
  domain: string;
  onReturn: () => void;
  mode?: 'strict' | 'friction' | 'memento';
  onUnlock?: () => void;
  preMortemResponse?: string;
  settings: AppSettings;
  tabLimit?: number;
}

const BlockedView: React.FC<BlockedViewProps> = ({ domain, onReturn, mode = 'strict', onUnlock, preMortemResponse, settings, tabLimit = 5 }) => {
  // Initialize with a static quote immediately so there is no empty flash
  const [quote, setQuote] = useState<Quote>(() => getRandomQuote());
  const [challengeText, setChallengeText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [failed, setFailed] = useState(false);
  const [mementoMoriDisabled, setMementoMoriDisabled] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      // Only attempt AI fetch if key exists and is not empty
      if (settings.geminiApiKey && settings.geminiApiKey.trim() !== '') {
        const context = domain.replace(/(^\w+:|^)\/\//, '').split('.')[0];
        const dynamicQuote = await getStoicQuote(context, settings.geminiApiKey);
        if (dynamicQuote) {
          setQuote(dynamicQuote);
        }
      }
      // If no key, we already have the initial static quote, so do nothing.
    };

    fetchQuote();

    if (mode === 'friction') {
      const q = getRandomQuote();
      setChallengeText(q.text);
    }
  }, [mode, domain, settings.geminiApiKey]);

  const handleDisableMementoMori = async () => {
    const updatedSettings = { ...settings, mementoMoriEnabled: false };
    await chrome.storage.sync.set({ settings: updatedSettings });
    setMementoMoriDisabled(true);
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: updatedSettings });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setUserInput(newVal);
    
    // Strict checking: if user makes a typo (input doesn't match start of text), reset or fail
    if (!challengeText.startsWith(newVal)) {
      setFailed(true);
      setTimeout(() => {
        setUserInput('');
        setFailed(false);
      }, 500);
    }

    if (newVal === challengeText) {
      if (onUnlock) onUnlock();
    }
  };

  const displayDomain = domain.length > 64 ? `${domain.slice(0, 48)}…${domain.slice(-12)}` : domain;

  return (
    <div className="h-full overflow-y-auto bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300 font-mono selection:bg-black selection:text-white">
      <div className="w-full max-w-4xl border-2 border-black p-8 md:p-16 relative my-auto">
        {/* Decorative Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 bg-black"></div>
        <div className="absolute top-0 right-0 w-4 h-4 bg-black"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 bg-black"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-black"></div>
        
        <div className="flex flex-col items-center space-y-12">
          
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
               <Square fill="currentColor" className="w-4 h-4 text-black" />
               <span className="text-xs font-bold uppercase tracking-[0.3em]">
                 {mode === 'friction' ? 'Typing Tax Protocol' : 'System Intervention'}
               </span>
            </div>
            <h1 className="text-sm text-zinc-500 uppercase tracking-widest">
              Access {mode === 'friction' ? 'Restricted' : 'Denied'}:{' '}
              <span className="text-black font-bold border-b-2 border-black max-w-full inline-block truncate align-middle" title={domain}>
                {displayDomain}
              </span>
            </h1>
          </div>

          <div className="py-8 w-full max-w-2xl">
              {mode === 'memento' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <Layers className="w-6 h-6 text-zinc-900" />
                    <h2 className="text-2xl font-bold uppercase tracking-tight">Memento Mori</h2>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed max-w-xl mx-auto">
                    Your tab limit ({tabLimit} tabs) has been reached. This is a reminder that time is finite, and every tab represents a commitment of attention.
                  </p>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest max-w-xl mx-auto">
                    Close existing tabs to open new ones, or disable this feature below.
                  </p>
                  {!mementoMoriDisabled && (
                    <div className="mt-8 p-6 border-2 border-zinc-900 bg-zinc-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold uppercase tracking-tight mb-1">Disable Memento Mori</p>
                          <p className="text-xs text-zinc-500 font-mono">Turn off automatic tab management</p>
                        </div>
                        <button
                          onClick={handleDisableMementoMori}
                          className="px-6 py-3 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Disable
                        </button>
                      </div>
                    </div>
                  )}
                  {mementoMoriDisabled && (
                    <div className="mt-8 p-6 border-2 border-emerald-500 bg-emerald-50">
                      <p className="text-sm font-bold uppercase tracking-tight text-emerald-900">Feature Disabled</p>
                      <p className="text-xs text-emerald-700 font-mono mt-1">Memento Mori has been turned off. You can re-enable it in Settings.</p>
                    </div>
                  )}
                </div>
              ) : mode === 'friction' ? (
                <div className="space-y-6">
                   <p className="text-xs text-zinc-500 uppercase tracking-widest">Type the following text perfectly to proceed:</p>
                   <div className="p-6 bg-zinc-50 border border-zinc-200 text-left relative select-none">
                      <p className="font-serif text-lg leading-relaxed text-zinc-400">{challengeText}</p>
                      <div className="absolute top-6 left-6 right-6 bottom-6 pointer-events-none">
                        <span className="font-serif text-lg leading-relaxed text-black">{userInput}</span>
                        <span className="animate-pulse border-r-2 border-black h-5 inline-block align-middle ml-0.5"></span>
                      </div>
                   </div>
                   <textarea 
                     value={userInput}
                     onChange={handleInputChange}
                     className={`w-full p-4 border-2 font-serif text-lg focus:outline-none transition-colors ${failed ? 'border-red-500 bg-red-50' : 'border-zinc-900'}`}
                     placeholder="Begin typing..."
                     autoFocus
                     rows={3}
                   />
                </div>
              ) : (
                <blockquote className="space-y-8">
                  <p className="text-xl md:text-2xl lg:text-3xl font-serif italic text-black leading-tight max-w-3xl mx-auto">
                    "{quote.text}"
                  </p>
                  <footer className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-500">
                    — {quote.author}
                  </footer>

                  {preMortemResponse && (
                    <div className="mt-12 p-6 border border-zinc-900 bg-zinc-50">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Your Negative Visualization</p>
                       <p className="font-serif italic text-lg text-black">"You predicted: <span className="underline">{preMortemResponse}</span>"</p>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mt-4">Were you right?</p>
                    </div>
                  )}
                </blockquote>
              )}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onReturn}
              className="group relative px-8 py-4 bg-black text-white hover:bg-zinc-800 transition-colors uppercase font-bold tracking-widest text-xs flex items-center gap-4 overflow-hidden"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Return to Purpose
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BlockedView;
