
import React, { useState, useRef } from 'react';
import { Play, ArrowRight, Zap, Shield, Check, AlertTriangle } from 'lucide-react';
import { AppSettings } from '../src/types';

interface OnboardingModalProps {
  onClose: () => void;
  onUpdateSettings: (s: Partial<AppSettings>) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose, onUpdateSettings }) => {
  const [step, setStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else onClose();
  };

  const enableHardcore = () => {
    onUpdateSettings({ hardcoreMode: true });
    handleNext();
  };

  const togglePlay = () => {
    if (videoRef.current && !videoError) {
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-12 border-b-2 border-zinc-900 flex items-center justify-between px-6 bg-zinc-50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-zinc-900 animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-900">Initiating Protocol...</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-zinc-900' : 'bg-zinc-300'}`} />
              <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-zinc-900' : 'bg-zinc-300'}`} />
              <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-zinc-900' : 'bg-zinc-300'}`} />
            </div>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors" aria-label="Close onboarding">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 md:p-12 min-h-[400px] flex flex-col">
          
          {/* STEP 1: VIDEO BRIEFING */}
          {step === 1 && (
            <div className="flex flex-col animate-in slide-in-from-right duration-300">
              <h2 className="text-3xl font-bold uppercase tracking-tighter mb-2">Welcome to the Citadel</h2>
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-8">Watch the briefing to understand the mechanism.</p>
              
              {/* Video Player */}
              <div 
                className="w-full bg-zinc-900 relative group cursor-pointer border-2 border-zinc-900 overflow-hidden flex items-center justify-center"
                style={{ aspectRatio: '1710/982', maxWidth: '100%' }}
                onClick={togglePlay}
              >
                {/* Fallback Shimmer Background */}
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]"></div>
                
                {!videoError ? (
                    <video 
                        ref={videoRef}
                        className={`absolute inset-0 w-full h-full object-contain transition-all duration-500 ${isPlaying ? 'opacity-100 grayscale-0' : 'opacity-60 grayscale hover:grayscale-0'}`}
                        onEnded={() => setIsPlaying(false)}
                        onError={() => setVideoError(true)}
                        playsInline
                    >
                        <source src={typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.getURL('demo.mp4') : '/demo.mp4'} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 p-8 text-center z-20">
                        <AlertTriangle className="w-8 h-8 text-zinc-500 mb-2" />
                        <p className="text-white font-bold text-sm uppercase tracking-widest mb-1">Source Not Found</p>
                        <p className="text-zinc-500 text-[10px] font-mono">Place 'demo.mp4' in your public/ folder to enable the briefing.</p>
                    </div>
                )}

                {!isPlaying && !videoError && (
                  <>
                    <div className="w-20 h-20 border-2 border-white rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-black/50 backdrop-blur-sm z-10">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <p className="absolute bottom-4 left-4 text-white font-mono text-[10px] uppercase tracking-widest z-10 drop-shadow-md">demo.mp4</p>
                    <p className="absolute bottom-4 right-4 text-white font-mono text-[10px] uppercase tracking-widest z-10 drop-shadow-md">02:15</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PHILOSOPHY */}
          {step === 2 && (
            <div className="flex-1 flex flex-col justify-center animate-in slide-in-from-right duration-300">
              <h2 className="text-3xl font-bold uppercase tracking-tighter mb-8 text-center">Define Your Boundaries</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="border-2 border-zinc-900 p-6 hover:bg-zinc-50 transition-colors">
                   <div className="w-10 h-10 bg-zinc-900 text-white flex items-center justify-center mb-4"><Shield className="w-5 h-5"/></div>
                   <h3 className="text-lg font-bold uppercase mb-2">Blacklist</h3>
                   <p className="text-xs font-mono text-zinc-500 leading-relaxed">The Iron Curtain. Absolute restriction. Attempting to visit these sites results in a redirect to Stoic wisdom.</p>
                </div>
                <div className="border-2 border-zinc-900 p-6 hover:bg-zinc-50 transition-colors">
                   <div className="w-10 h-10 border-2 border-zinc-900 text-zinc-900 flex items-center justify-center mb-4"><Zap className="w-5 h-5"/></div>
                   <h3 className="text-lg font-bold uppercase mb-2">Grey List</h3>
                   <p className="text-xs font-mono text-zinc-500 leading-relaxed">The Friction Zone. You can access these sites, but only if you pay the "Typing Tax"—perfectly typing a difficult philosophical text.</p>
                </div>
              </div>
            </div>
          )}

           {/* STEP 3: CALIBRATION */}
           {step === 3 && (
            <div className="flex-1 flex flex-col justify-center items-center text-center animate-in slide-in-from-right duration-300">
              <h2 className="text-3xl font-bold uppercase tracking-tighter mb-4">Final Calibration</h2>
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-12 max-w-md">Do you have the strength to commit fully, or do you require a gentle start?</p>
              
              <div className="grid grid-cols-1 w-full max-w-md gap-4">
                <button onClick={enableHardcore} className="group relative border-2 border-zinc-900 p-6 hover:bg-zinc-900 transition-colors text-left">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-lg font-bold uppercase group-hover:text-white">Enable Hardcore Mode</span>
                      <Zap className="w-5 h-5 text-zinc-900 group-hover:text-white" />
                   </div>
                   <p className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-400">To disable protections, you must solve a chess puzzle. No easy exits.</p>
                </button>

                <button onClick={handleNext} className="group relative border-2 border-zinc-200 p-4 hover:border-zinc-900 transition-colors text-left">
                   <div className="flex justify-between items-center">
                      <span className="text-sm font-bold uppercase text-zinc-500 group-hover:text-zinc-900">Standard Mode</span>
                      <Check className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900" />
                   </div>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="h-16 border-t-2 border-zinc-900 flex items-center justify-between px-8 bg-zinc-50">
          <button onClick={onClose} className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900">Skip Briefing</button>
          
          {step < 3 ? (
            <button onClick={handleNext} className="flex items-center gap-2 px-6 py-2 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={onClose} className="flex items-center gap-2 px-6 py-2 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors">
              Enter Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default OnboardingModal;
