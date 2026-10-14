
import React, { useState, useEffect, useMemo } from 'react';
import { Dna, TextCursorInput, Gamepad2, Check, X, RefreshCw, Trophy, ArrowRight, Sparkles } from 'lucide-react';
import { AnalysisResult, VocabItem, PhraseItem } from '../types';
import { Language } from '../translations';
import SentenceBuilder from './SentenceBuilder';

interface ExerciseArenaProps {
  result: AnalysisResult;
  language?: Language;
}

type Tab = 'match' | 'cloze' | 'builder';

const ExerciseArena: React.FC<ExerciseArenaProps> = ({ result, language = 'uz' }) => {
  const [activeTab, setActiveTab] = useState<Tab>('match');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('match')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'match' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          <Dna className="w-4 h-4" /> {language === 'uz' ? 'Juftliklarni topish' : 'Match Pairs'}
        </button>
        <button
          onClick={() => setActiveTab('cloze')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'cloze' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          <TextCursorInput className="w-4 h-4" /> {language === 'uz' ? "Bo'sh o'rinlarni to'ldirish" : 'Fill Phrases'}
        </button>
        {result.sentenceChallenge && (
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'builder' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Gamepad2 className="w-4 h-4" /> {language === 'uz' ? 'Gap tuzish' : 'Sentence Lab'}
          </button>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 transition-all duration-300">
        {activeTab === 'match' && <MatchingGame vocabulary={result.vocabulary} language={language} />}
        {activeTab === 'cloze' && <ClozeGame phrases={result.phrases} language={language} />}
        {activeTab === 'builder' && result.sentenceChallenge && <SentenceBuilder challenge={result.sentenceChallenge} language={language} />}
      </div>
    </div>
  );
};

/* --- MATCHING GAME SUB-COMPONENT --- */
const MatchingGame: React.FC<{ vocabulary: VocabItem[]; language?: Language }> = ({ vocabulary, language = 'uz' }) => {
  const [pairs, setPairs] = useState<{ id: string, text: string, type: 'de' | 'en', matchId: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    resetGame();
  }, [vocabulary]);

  const resetGame = () => {
    const gameItems = vocabulary.slice(0, 8); // Take top 8
    const deItems = gameItems.map((v, i) => ({ id: `de-${i}`, text: v.word, type: 'de' as const, matchId: `pair-${i}` }));
    const enItems = gameItems.map((v, i) => ({ id: `en-${i}`, text: v.meaning, type: 'en' as const, matchId: `pair-${i}` }));
    
    // Shuffle
    const combined = [...deItems, ...enItems].sort(() => Math.random() - 0.5);
    setPairs(combined);
    setMatched(new Set());
    setSelected(null);
    setErrorId(null);
  };

  const handleCardClick = (id: string, matchId: string) => {
    if (matched.has(matchId) || errorId) return;

    if (!selected) {
      setSelected(id);
    } else {
      if (selected === id) {
        setSelected(null); // Deselect
        return;
      }
      
      const prevCard = pairs.find(p => p.id === selected);
      if (prevCard && prevCard.matchId === matchId) {
        // Match!
        const newMatched = new Set(matched);
        newMatched.add(matchId);
        setMatched(newMatched);
        setSelected(null);
      } else {
        // Mismatch
        setErrorId(id);
        setTimeout(() => {
          setErrorId(null);
          setSelected(null);
        }, 800);
      }
    }
  };

  const isComplete = matched.size === Math.min(vocabulary.length, 8) && vocabulary.length > 0;

  if (vocabulary.length < 2) return (
    <div className="text-center text-slate-500">
      {language === 'uz' ? "Juftlik o'yini uchun so'zlar yetarli emas." : "Not enough words for matching game."}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h3 className="font-bold text-slate-700 dark:text-slate-300">
           {language === 'uz' ? "Nemischa so'zni uning ma'nosi bilan moslashtiring" : "Match the definition"}
         </h3>
         <button onClick={resetGame} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors" title={language === 'uz' ? 'Qayta boshlash' : 'Restart'}>
           <RefreshCw className="w-4 h-4" />
         </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {pairs.map((card) => {
          const isMatched = matched.has(card.matchId);
          const isSelected = selected === card.id;
          const isError = errorId === card.id || (selected && errorId && selected === card.id); 

          if (isMatched) return <div key={card.id} className="h-24 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center justify-center opacity-50"><Check className="text-emerald-400" /></div>;

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id, card.matchId)}
              className={`
                h-24 p-3 rounded-xl text-sm font-bold flex items-center justify-center text-center transition-all duration-200 active:scale-95
                ${isSelected 
                  ? 'bg-indigo-600 text-white shadow-lg scale-105 z-10' 
                  : isError
                    ? 'bg-rose-500 text-white animate-shake'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 border-2 border-transparent'
                }
              `}
            >
              {card.text}
            </button>
          );
        })}
      </div>
      {isComplete && (
        <div className="text-center animate-in fade-in slide-in-from-bottom-2 p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-800 dark:text-emerald-200 font-bold">
           {language === 'uz' ? "🎉 Barcha juftliklar topildi! Barakalla!" : "🎉 All pairs matched! Great job!"}
        </div>
      )}
       <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}} />
    </div>
  );
};

/* --- CLOZE GAME SUB-COMPONENT (PHRASES & COLLOCATIONS) --- */
const ClozeGame: React.FC<{ phrases: PhraseItem[]; language?: Language }> = ({ phrases, language = 'uz' }) => {
  const [questions, setQuestions] = useState<{ question: string, answer: string, options: string[], meaning: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    generateQuestions();
  }, [phrases]);

  const generateQuestions = () => {
    // Filter items with context sentences
    const candidates = phrases.filter(p => p.exampleSentence && p.exampleSentence.length > 10);
    
    if (candidates.length === 0) {
      setQuestions([]);
      return;
    }

    const qList = candidates.map(p => {
      // Escape special characters for regex
      const escapedPhrase = p.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Case-insensitive regex to find the phrase
      const regex = new RegExp(escapedPhrase, 'gi');
      
      const questionText = p.exampleSentence.replace(regex, '_________');
      
      // Distractors: Pick 2 random other phrases
      const others = phrases.filter(o => o.phrase !== p.phrase).map(o => o.phrase);
      const shuffledOthers = others.sort(() => Math.random() - 0.5).slice(0, 2);
      
      // If not enough distractors, fill with generic placeholders (edge case)
      while (shuffledOthers.length < 2) shuffledOthers.push("???");

      const options = [p.phrase, ...shuffledOthers].sort(() => Math.random() - 0.5);
      
      return {
        question: questionText,
        answer: p.phrase,
        options,
        meaning: p.actualMeaning
      };
    }).slice(0, 5); // Max 5 questions

    setQuestions(qList);
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setSelectedOption(null);
  };

  const handleAnswer = (option: string) => {
    if (selectedOption) return; // Block multiple clicks
    setSelectedOption(option);

    const correct = option === questions[currentIndex].answer;
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
      } else {
        setIsFinished(true);
      }
    }, 1500);
  };

  if (phrases.length === 0) return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
      <Sparkles className="w-8 h-8 mb-2 opacity-50" />
      <p>{language === 'uz' ? "Mashq hosil qilish uchun iboralar topilmadi." : "No phrases found to generate exercises."}</p> 
      <p className="text-xs">{language === 'uz' ? "Matnni tahlil qiling va undagi iboralar paydo bo'ladi." : "Try analyzing a text with idioms or collocations."}</p>
    </div>
  );

  if (questions.length === 0) return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
      <Sparkles className="w-8 h-8 mb-2 opacity-50" />
      <p>{language === 'uz' ? "Mashqlar uchun misollar yetarli emas." : "Not enough context found for exercises."}</p> 
      <p className="text-xs">{language === 'uz' ? "Biroz uzunroq matn yoki gaplar tahlil qilib ko'ring." : "Try analyzing a text with longer example sentences."}</p>
    </div>
  );

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in zoom-in-95">
         <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400 mb-2">
           <Trophy className="w-8 h-8" />
         </div>
         <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
           {language === 'uz' ? "Mashq yakunlandi!" : "Exercise Complete!"}
         </h3>
         <p className="text-slate-600 dark:text-slate-400">
           {language === 'uz' ? `${questions.length} tadan ${score} ta to'g'ri topdingiz` : `You scored ${score} out of ${questions.length}`}
         </p>
         <button onClick={generateQuestions} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
           {language === 'uz' ? "Qayta urinish" : "Try Again"}
         </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  if (!currentQ) return null;

  return (
    <div className="max-w-xl mx-auto space-y-8 py-4">
      <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
         <span>
           {language === 'uz' ? `${currentIndex + 1} / ${questions.length}-savol` : `Question ${currentIndex + 1} / ${questions.length}`}
         </span>
         <span>
           {language === 'uz' ? `Ball: ${score}` : `Score: ${score}`}
         </span>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
         <div className="flex items-center justify-center gap-2 mb-4 text-indigo-500 font-bold text-xs uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            <span>{language === 'uz' ? "Iborani to'ldiring" : "Complete the Idiom"}</span>
         </div>
         <p className="text-xl font-medium text-slate-800 dark:text-slate-200 leading-relaxed mb-4">
           "{currentQ.question}"
         </p>
         <p className="text-sm text-slate-400 italic">
           {language === 'uz' ? "Ma'nosi: " : "Meaning: "} {currentQ.meaning}
         </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
         {currentQ.options.map((opt, i) => {
           let stateClass = 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400';
           if (selectedOption) {
             if (opt === currentQ.answer) stateClass = 'bg-emerald-500 text-white border-emerald-600';
             else if (opt === selectedOption) stateClass = 'bg-rose-500 text-white border-rose-600';
             else stateClass = 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-50';
           }

           return (
             <button
               key={i}
               onClick={() => handleAnswer(opt)}
               disabled={!!selectedOption}
               className={`w-full p-4 rounded-xl font-bold border-2 border-transparent transition-all duration-200 ${stateClass}`}
             >
               {opt}
             </button>
           );
         })}
      </div>
    </div>
  );
};

export default ExerciseArena;
