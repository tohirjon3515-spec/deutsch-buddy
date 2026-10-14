import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  BookOpenCheck, 
  Search, 
  AlertCircle, 
  Smile, 
  Frown, 
  Sparkles, 
  BookOpen, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Check, 
  Volume2,
  Filter
} from 'lucide-react';
import { VocabItem, PhraseItem } from '../types';
import { Language } from '../translations';

interface SavedWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedWords: VocabItem[];
  savedPhrases: PhraseItem[];
  onRemove: (word: string) => void;
  onRemovePhrase: (phrase: string) => void;
  onClearAll: () => void;
  onUpdateWord: (word: string, updates: Partial<VocabItem>) => void;
  onImportWords?: (words: VocabItem[]) => void;
  onImportPhrases?: (phrases: PhraseItem[]) => void;
  language?: Language;
}

const SavedWordsModal: React.FC<SavedWordsModalProps> = ({ 
  isOpen, 
  onClose, 
  savedWords, 
  savedPhrases, 
  onRemove, 
  onRemovePhrase, 
  onClearAll, 
  onUpdateWord, 
  language = 'uz' 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'hard' | 'easy'>('all');
  const [activeTab, setActiveTab] = useState<'words' | 'phrases'>('words');

  // Flashcard State
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardDeck, setFlashcardDeck] = useState<any[]>([]);

  // Navigation Logic
  const handleNextCard = () => {
    if (flashcardIndex < flashcardDeck.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setFlashcardIndex(prev => prev + 1), 150);
    }
  };

  const handlePrevCard = () => {
    if (flashcardIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setFlashcardIndex(prev => prev - 1), 150);
    }
  };

  const startFlashcards = () => {
    const deck = activeTab === 'words' 
      ? filteredWords.map(w => ({ ...w, cardType: 'word' }))
      : filteredPhrases.map(p => ({ ...p, cardType: 'phrase' }));
    
    if (deck.length === 0) return;
    setFlashcardDeck(deck);
    setFlashcardIndex(0);
    setIsFlipped(false);
    setIsFlashcardMode(true);
  };

  // Keyboard Shortcuts for Flashcards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFlashcardMode) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault(); 
          setIsFlipped(prev => !prev);
          break;
        case 'ArrowRight':
          e.preventDefault(); 
          handleNextCard();
          break;
        case 'ArrowLeft':
          e.preventDefault(); 
          handlePrevCard();
          break;
        case 'Escape':
          e.preventDefault(); 
          setIsFlashcardMode(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlashcardMode, flashcardIndex, isFlipped, flashcardDeck]);

  const filteredWords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return savedWords.filter(item => {
      const matchesSearch = !q || 
        item.word.toLowerCase().includes(q) || 
        item.meaning.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q);
      
      const matchesFilter = 
        filterDifficulty === 'all' || 
        (filterDifficulty === 'hard' && item.difficulty === 'hard') ||
        (filterDifficulty === 'easy' && item.difficulty === 'easy');

      return matchesSearch && matchesFilter;
    });
  }, [savedWords, searchQuery, filterDifficulty]);

  const filteredPhrases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return savedPhrases.filter(p => {
      return !q || 
        p.phrase.toLowerCase().includes(q) || 
        p.actualMeaning.toLowerCase().includes(q) ||
        p.explanation.toLowerCase().includes(q);
    });
  }, [savedPhrases, searchQuery]);

  // Color coding for German articles (der, die, das)
  const getArticleBadge = (word: string, type: string) => {
    const lower = word.toLowerCase();
    if (lower.startsWith('der ')) {
      return { text: 'der (m)', style: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
    }
    if (lower.startsWith('die ')) {
      return { text: 'die (f)', style: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
    }
    if (lower.startsWith('das ')) {
      return { text: 'das (n)', style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
    }
    return { text: type, style: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
  };

  if (!isOpen) return null;

  const currentCount = activeTab === 'words' ? filteredWords.length : filteredPhrases.length;
  const totalCount = savedWords.length + savedPhrases.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Dialog Card */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300 z-10">
        
        {/* Mobile Swipe / Drag Pill */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        {!isFlashcardMode && (
          <div className="flex flex-col border-b border-slate-100 dark:border-slate-800/80 shrink-0">
            {/* Top Bar: Title & Actions */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                  <BookOpenCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {language === 'uz' ? "Mening lug'atim" : 'My Study Deck'}
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                      {totalCount}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                    {language === 'uz' ? "Bulutda (Firebase) avtomatik sinxronlangan" : "Automatically synced to cloud"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Flashcards Review Button */}
                <button 
                  onClick={startFlashcards}
                  disabled={currentCount === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                  title="Flashcards"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{language === 'uz' ? 'Mashq qilish' : 'Practice'}</span>
                </button>

                <button 
                  onClick={onClose} 
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Segmented Tabs: Words vs Phrases */}
            <div className="px-4 sm:px-6 pb-3 flex items-center justify-between gap-3">
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-full sm:w-auto border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
                <button 
                  onClick={() => { setActiveTab('words'); setSearchQuery(''); }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'words' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span>{language === 'uz' ? "So'zlar" : 'Words'}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-600 font-mono">
                    {savedWords.length}
                  </span>
                </button>

                <button 
                  onClick={() => { setActiveTab('phrases'); setSearchQuery(''); }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'phrases' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{language === 'uz' ? 'Iboralar' : 'Idioms'}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-600 font-mono">
                    {savedPhrases.length}
                  </span>
                </button>
              </div>

              {/* Difficulty Quick Filter (Words only) */}
              {activeTab === 'words' && (
                <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    onClick={() => setFilterDifficulty('all')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterDifficulty === 'all'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-indigo-600'
                    }`}
                  >
                    {language === 'uz' ? 'Hammasi' : 'All'}
                  </button>
                  <button
                    onClick={() => setFilterDifficulty('hard')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      filterDifficulty === 'hard'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-rose-600'
                    }`}
                  >
                    <Frown className="w-3.5 h-3.5" />
                    <span>{language === 'uz' ? 'Qiyin' : 'Hard'}</span>
                  </button>
                  <button
                    onClick={() => setFilterDifficulty('easy')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      filterDifficulty === 'easy'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-emerald-600'
                    }`}
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>{language === 'uz' ? 'Oson' : 'Easy'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="px-4 sm:px-6 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={language === 'uz' ? "Lug'atdan qidirish..." : 'Search saved items...'} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Body: Words / Phrases List or Flashcards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isFlashcardMode ? (
            /* ================= FLASHCARD REVIEW MODE ================= */
            <div className="h-full flex flex-col justify-between py-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setIsFlashcardMode(false)} 
                  className="flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> {language === 'uz' ? 'Chiqish' : 'Exit'}
                </button>
                <div className="text-center">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                    {language === 'uz' ? 'Kartochka Mashqi' : 'Review Card'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {flashcardIndex + 1} / {flashcardDeck.length}
                  </span>
                </div>
                <div className="w-12" />
              </div>

              {/* The Flip Card */}
              <div className="flex-1 flex items-center justify-center my-2">
                <div 
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`relative w-full max-w-sm h-64 sm:h-72 cursor-pointer transition-transform duration-500 rounded-3xl shadow-xl border border-indigo-200/80 dark:border-indigo-900/50 p-6 flex flex-col items-center justify-center text-center ${
                    isFlipped 
                      ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white' 
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {!isFlipped ? (
                    /* Front: German */
                    <>
                      <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 tracking-widest mb-3">
                        🇩🇪 Deutsch
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black leading-tight">
                        {flashcardDeck[flashcardIndex].cardType === 'word' 
                          ? flashcardDeck[flashcardIndex].word 
                          : flashcardDeck[flashcardIndex].phrase}
                      </h3>
                      {flashcardDeck[flashcardIndex].grammarForms && (
                        <span className="mt-2 text-xs font-mono text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg">
                          {flashcardDeck[flashcardIndex].grammarForms}
                        </span>
                      )}
                      <div className="mt-6 flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        <Eye size={13} /> {language === 'uz' ? 'Tarjimani ko\'rish uchun bosing' : 'Tap to reveal translation'}
                      </div>
                    </>
                  ) : (
                    /* Back: Uzbek Translation */
                    <>
                      <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-widest mb-2">
                        🇺🇿 O'zbekcha Ma'nosi
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black leading-tight text-white mb-2">
                        {flashcardDeck[flashcardIndex].cardType === 'word' 
                          ? flashcardDeck[flashcardIndex].meaning 
                          : flashcardDeck[flashcardIndex].actualMeaning}
                      </h3>
                      {(flashcardDeck[flashcardIndex].contextSentence || flashcardDeck[flashcardIndex].exampleSentence) && (
                        <p className="mt-3 text-xs italic text-indigo-100 bg-white/10 p-2.5 rounded-xl border border-white/20 line-clamp-3">
                          "{flashcardDeck[flashcardIndex].cardType === 'word' 
                            ? flashcardDeck[flashcardIndex].contextSentence 
                            : flashcardDeck[flashcardIndex].exampleSentence}"
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-center gap-4 mt-2">
                <button 
                  onClick={handlePrevCard}
                  disabled={flashcardIndex === 0}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 disabled:opacity-30 active:scale-95 transition-all"
                  title="Previous"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const item = flashcardDeck[flashcardIndex];
                      if (item.cardType === 'word') onUpdateWord(item.word, { difficulty: 'easy' });
                      handleNextCard();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white rounded-2xl text-xs font-bold active:scale-95 transition-all"
                  >
                    <Smile className="w-4 h-4" />
                    <span>{language === 'uz' ? 'Oson' : 'Easy'}</span>
                  </button>

                  <button 
                    onClick={() => {
                      const item = flashcardDeck[flashcardIndex];
                      if (item.cardType === 'word') onUpdateWord(item.word, { difficulty: 'hard' });
                      handleNextCard();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-600 hover:text-white rounded-2xl text-xs font-bold active:scale-95 transition-all"
                  >
                    <Frown className="w-4 h-4" />
                    <span>{language === 'uz' ? 'Qiyin' : 'Hard'}</span>
                  </button>
                </div>

                <button 
                  onClick={handleNextCard}
                  disabled={flashcardIndex === flashcardDeck.length - 1}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 disabled:opacity-30 active:scale-95 transition-all"
                  title="Next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            /* ================= WORDS & PHRASES LIST ================= */
            <>
              {(activeTab === 'words' ? savedWords : savedPhrases).length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40 text-indigo-500" />
                  <p className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'uz' 
                      ? (activeTab === 'words' ? "Hozircha saqlangan so'zlar yo'q" : "Hozircha saqlangan iboralar yo'q")
                      : `No saved ${activeTab} yet`}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {language === 'uz'
                      ? "Matn tahlil qilinganda istalgan so'z yoki ibora yonidagi xatcho'p (bookmark) belgisini bosing."
                      : "Click the bookmark icon on words during analysis to save them here."}
                  </p>
                </div>
              ) : currentCount === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm font-semibold">
                    {language === 'uz' ? "Hech qanday natija topilmadi" : "No matches found"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {activeTab === 'words' ? (
                    filteredWords.map((item, index) => {
                      const articleBadge = getArticleBadge(item.word, item.type);
                      return (
                        <div 
                          key={`${item.word}-${index}`} 
                          className="p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                                  {item.word}
                                </h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${articleBadge.style}`}>
                                  {articleBadge.text}
                                </span>
                                {item.difficulty === 'hard' && (
                                  <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/40">
                                    {language === 'uz' ? 'QIYIN' : 'HARD'}
                                  </span>
                                )}
                                {item.difficulty === 'easy' && (
                                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40">
                                    {language === 'uz' ? 'OSON' : 'EASY'}
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-1">
                                {item.meaning}
                              </p>

                              {item.grammarForms && (
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                  {item.grammarForms}
                                </p>
                              )}

                              {item.contextSentence && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1.5 line-clamp-2 border-l-2 border-indigo-400 pl-2">
                                  "{item.contextSentence}"
                                </p>
                              )}
                            </div>

                            {/* Card Actions: Easy/Hard toggle & Delete */}
                            <div className="flex items-center gap-1 shrink-0 self-center">
                              <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm">
                                <button 
                                  onClick={() => onUpdateWord(item.word, { difficulty: item.difficulty === 'easy' ? undefined : 'easy' })} 
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    item.difficulty === 'easy' 
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                                      : 'text-slate-400 hover:text-emerald-600'
                                  }`} 
                                  title="Mark as Easy"
                                >
                                  <Smile className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => onUpdateWord(item.word, { difficulty: item.difficulty === 'hard' ? undefined : 'hard' })} 
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    item.difficulty === 'hard' 
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                                      : 'text-slate-400 hover:text-rose-600'
                                  }`} 
                                  title="Mark as Hard"
                                >
                                  <Frown className="w-4 h-4" />
                                </button>
                              </div>

                              <button 
                                onClick={() => onRemove(item.word)} 
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    filteredPhrases.map((item, index) => {
                      return (
                        <div 
                          key={`${item.phrase}-${index}`} 
                          className="p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className="font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                              {item.phrase}
                            </h3>
                            <button 
                              onClick={() => onRemovePhrase(item.phrase)} 
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-1">
                            {item.actualMeaning}
                          </p>

                          {item.literalTranslation && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-1">
                              {language === 'uz' ? "So'zma-so'z: " : "Literal: "}
                              "{item.literalTranslation}"
                            </p>
                          )}

                          {item.exampleSentence && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 p-2 rounded-xl mt-2 border border-slate-200/60 dark:border-slate-700/60">
                              "{item.exampleSentence}"
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex items-center justify-between gap-3 shrink-0">
          {showClearConfirm ? (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {language === 'uz' ? "Tozalaysizmi?" : "Clear all?"}
              </span>
              <button 
                onClick={() => { onClearAll(); setShowClearConfirm(false); }} 
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                {language === 'uz' ? 'Ha' : 'Yes'}
              </button>
              <button 
                onClick={() => setShowClearConfirm(false)} 
                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium"
              >
                {language === 'uz' ? 'Yo\'q' : 'No'}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => totalCount > 0 ? setShowClearConfirm(true) : null} 
              disabled={totalCount === 0} 
              className={`text-xs font-semibold transition-colors ${
                totalCount === 0 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600'
              }`}
            >
              {language === 'uz' ? "Lug'atni tozalash" : "Clear all"}
            </button>
          )}

          <button 
            onClick={onClose} 
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95"
          >
            {language === 'uz' ? 'Yopish' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavedWordsModal;
