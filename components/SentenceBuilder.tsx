
import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, CheckCircle2, Info, SendHorizontal, XCircle, Lightbulb, ChevronRight, HelpCircle } from 'lucide-react';
import { SentenceChallenge } from '../types';
import { Language } from '../translations';

interface SentenceBuilderProps {
  challenge: SentenceChallenge;
  language?: Language;
}

interface SelectedWord {
  word: string;
  bankIndex: number;
}

const SentenceBuilder: React.FC<SentenceBuilderProps> = ({ challenge, language = 'uz' }) => {
  const [availableWords, setAvailableWords] = useState<(string | null)[]>([]);
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [wrongAtIdx, setWrongAtIdx] = useState<number | null>(null);
  const [hintIdx, setHintIdx] = useState<number | null>(null);

  const targetWords = useMemo(() => challenge.target.split(' '), [challenge.target]);

  useEffect(() => {
    reset();
  }, [challenge]);

  const reset = () => {
    setAvailableWords([...challenge.shuffled]);
    setSelectedWords([]);
    setIsCorrect(false);
    setIsWrong(false);
    setWrongAtIdx(null);
    setHintIdx(null);
  };

  const handleWordClick = (word: string, bankIndex: number) => {
    if (isCorrect || word === null) return;
    setIsWrong(false);
    setWrongAtIdx(null);
    setHintIdx(null);
    
    // Add to result area
    setSelectedWords([...selectedWords, { word, bankIndex }]);
    
    // Mark as used in bank (keep the slot so indexes don't shift)
    const nextAvailable = [...availableWords];
    nextAvailable[bankIndex] = null;
    setAvailableWords(nextAvailable);
  };

  const handleRemoveWord = (selectedIdx: number) => {
    if (isCorrect) return;
    setIsWrong(false);
    setWrongAtIdx(null);

    const removed = selectedWords[selectedIdx];
    const nextSelected = [...selectedWords];
    nextSelected.splice(selectedIdx, 1);
    setSelectedWords(nextSelected);

    // Return to bank
    const nextAvailable = [...availableWords];
    nextAvailable[removed.bankIndex] = removed.word;
    setAvailableWords(nextAvailable);
  };

  const checkAnswer = () => {
    const userSentence = selectedWords.map(sw => sw.word).join(' ');
    
    // Clean strings for comparison (case insensitive, ignore extra punctuation spaces)
    const clean = (s: string) => s.replace(/[.,!?;:]/g, '').toLowerCase().trim();
    
    const targetClean = clean(challenge.target);
    const userClean = clean(userSentence);

    if (userClean === targetClean) {
      setIsCorrect(true);
      setIsWrong(false);
      setWrongAtIdx(null);
    } else {
      // Find where it went wrong for partial feedback
      const userWords = userSentence.split(' ');
      let firstError = -1;
      for (let i = 0; i < userWords.length; i++) {
        if (clean(userWords[i]) !== clean(targetWords[i])) {
          firstError = i;
          break;
        }
      }
      setWrongAtIdx(firstError);
      setIsWrong(true);
    }
  };

  const showHint = () => {
    if (isCorrect) return;
    const nextCorrectWord = targetWords[selectedWords.length];
    if (!nextCorrectWord) return;

    const idxInBank = availableWords.findIndex(w => w && w.toLowerCase().replace(/[.,!?;:]/g, '') === nextCorrectWord.toLowerCase().replace(/[.,!?;:]/g, ''));
    if (idxInBank !== -1) {
      setHintIdx(idxInBank);
      // Auto-clear hint after 2 seconds
      setTimeout(() => setHintIdx(null), 2000);
    }
  };

  return (
    <div className="space-y-8 py-4">
      {/* Target Translation Banner */}
      <div className="relative group overflow-hidden bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-800 p-5 rounded-3xl flex items-center gap-4 transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
           <Languages size={80} className="text-indigo-600" />
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-800 shrink-0">
          <BookOpen className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest mb-1">
            {language === 'uz' ? 'Ushbu gapni nemis tilida tuzing' : 'Translate this into German'}
          </h4>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 italic leading-snug">
            "{challenge.translation}"
          </p>
        </div>
      </div>

      {/* Construction Workspace */}
      <div className="space-y-4">
        <div className={`
          min-h-[160px] w-full p-8 bg-slate-50/50 dark:bg-slate-900/50 rounded-[2.5rem] border-4 border-dashed flex flex-wrap gap-3 items-center justify-center transition-all duration-500 relative
          ${isCorrect ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-900/20 shadow-lg shadow-emerald-500/10' : ''}
          ${isWrong ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-900/20 animate-shake' : 'border-slate-200 dark:border-slate-800'}
        `}>
          {selectedWords.length === 0 && !isCorrect && (
            <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-600 animate-pulse">
               <span className="text-sm font-medium">
                 {language === 'uz' ? "Gapni tuzish uchun quyidagi so'zlarni ketma-ket bosing" : 'Tap the words below to build the sentence'}
               </span>
               <div className="flex gap-1">
                 {[1,2,3].map(i => <div key={i} className="w-8 h-1 bg-current rounded-full opacity-30" />)}
               </div>
            </div>
          )}
          
          {selectedWords.map((sw, idx) => {
            const isError = isWrong && wrongAtIdx !== null && idx >= wrongAtIdx;
            return (
              <button
                key={`selected-${idx}`}
                onClick={() => handleRemoveWord(idx)}
                className={`
                  group px-5 py-3 rounded-2xl text-xl font-black shadow-sm transition-all animate-in zoom-in-95 duration-200 active:scale-90
                  ${isCorrect 
                    ? 'bg-emerald-500 text-white border-b-4 border-emerald-700 shadow-emerald-500/20' 
                    : isError
                      ? 'bg-rose-500 text-white border-b-4 border-rose-700 animate-shake'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-b-4 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                  }
                `}
              >
                {sw.word}
              </button>
            );
          })}

          {/* Success Glow Effect */}
          {isCorrect && (
            <div className="absolute inset-0 rounded-[2.5rem] bg-emerald-500/10 animate-pulse pointer-events-none" />
          )}
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-4">
           <button 
             onClick={showHint}
             disabled={isCorrect || selectedWords.length === targetWords.length}
             className="flex items-center gap-2 text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 transition-colors uppercase tracking-widest disabled:opacity-30"
           >
             <Lightbulb className="w-4 h-4" /> {language === 'uz' ? 'Maslahat olish' : 'Get Hint'}
           </button>

           <div className="flex gap-4">
             {!isCorrect && selectedWords.length > 0 && (
                <button
                  onClick={reset}
                  className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={language === 'uz' ? 'Qayta boshlash' : 'Reset everything'}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
             )}
             
             {!isCorrect && selectedWords.length === targetWords.length && (
                <button
                  onClick={checkAnswer}
                  className="flex items-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 transition-all active:scale-95 scale-110"
                >
                  <SendHorizontal className="w-5 h-5" />
                  {language === 'uz' ? 'Tekshirish' : 'Check'}
                </button>
             )}
           </div>
        </div>
      </div>

      {/* Result Messaging */}
      {isCorrect && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-black text-2xl">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            {language === 'uz' ? 'Ajoyib! Barakalla!' : 'Fantastisch!'}
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {language === 'uz' ? "Siz ushbu gap tuzilishini muvaffaqiyatli o'zlashtirdingiz." : "You've mastered this sentence structure."}
          </p>
          <button 
            onClick={reset}
            className="flex items-center gap-2 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> {language === 'uz' ? 'Qayta mashq qilish' : 'Practice again'}
          </button>
        </div>
      )}

      {isWrong && (
        <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-rose-500 font-black text-lg uppercase tracking-tighter">
            <XCircle className="w-5 h-5" />
            {language === 'uz' ? 'Deyarli to\'g\'ri... (Xatolik bor)' : 'Fast richtig... (Almost correct)'}
          </div>
          <p className="text-sm text-slate-500 text-center max-w-xs">
            {wrongAtIdx !== null && wrongAtIdx < selectedWords.length 
              ? (language === 'uz' ? `"${selectedWords[wrongAtIdx].word}" so'zi atrofini tekshiring.` : `Check the part around "${selectedWords[wrongAtIdx].word}".`)
              : (language === 'uz' ? "So'zlar tartibi yoki tinish belgilarini tekshiring." : "Check your word order or punctuation.")}
          </p>
        </div>
      )}

      {/* Word Bank Area */}
      {!isCorrect && (
        <div className="bg-slate-100/30 dark:bg-slate-900/30 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800">
          <h5 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-600 text-center tracking-[0.2em] mb-6">
            {language === 'uz' ? 'Mavjud so\'zlar' : 'Available Words'}
          </h5>
          <div className="flex flex-wrap gap-4 justify-center max-w-2xl mx-auto">
            {availableWords.map((word, idx) => {
              if (word === null) {
                return <div key={`empty-${idx}`} className="w-16 h-12 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700" />;
              }
              const isHint = hintIdx === idx;
              return (
                <button
                  key={`bank-${idx}-${word}`}
                  onClick={() => handleWordClick(word, idx)}
                  className={`
                    px-6 py-3 rounded-2xl text-xl font-bold shadow-sm transition-all duration-300 active:scale-90
                    ${isHint 
                      ? 'bg-amber-100 border-2 border-amber-400 text-amber-700 scale-110 shadow-lg animate-bounce' 
                      : 'bg-white dark:bg-slate-800 border-b-4 border-slate-200 dark:border-slate-950 text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 hover:-translate-y-1'
                    }
                  `}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        .animate-in {
          animation: zoomIn 0.3s ease-out;
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
};

// Internal icon proxy for clean file structure
const Languages = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>
  </svg>
);

const BookOpen = ({ size = 24, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

export default SentenceBuilder;
