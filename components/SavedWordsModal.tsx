import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  BookOpenCheck, 
  Search, 
  Smile, 
  Frown, 
  Sparkles, 
  BookOpen, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Check, 
  Printer,
  CheckSquare,
  Square,
  Award,
  RotateCcw
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

  // Multi-selection state for Print PDF
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [selectedPhrases, setSelectedPhrases] = useState<Set<string>>(new Set());

  // Flashcard State
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardDeck, setFlashcardDeck] = useState<any[]>([]);
  const [cardAnimationKey, setCardAnimationKey] = useState(0);

  // Reset selection when changing tabs
  const handleTabChange = (tab: 'words' | 'phrases') => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Toggle selection for individual items
  const toggleSelectWord = (word: string) => {
    setSelectedWords(prev => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const toggleSelectPhrase = (phrase: string) => {
    setSelectedPhrases(prev => {
      const next = new Set(prev);
      if (next.has(phrase)) next.delete(phrase);
      else next.add(phrase);
      return next;
    });
  };

  // Select all or deselect all
  const toggleSelectAll = () => {
    if (activeTab === 'words') {
      if (selectedWords.size === filteredWords.length && filteredWords.length > 0) {
        setSelectedWords(new Set());
      } else {
        setSelectedWords(new Set(filteredWords.map(w => w.word)));
      }
    } else {
      if (selectedPhrases.size === filteredPhrases.length && filteredPhrases.length > 0) {
        setSelectedPhrases(new Set());
      } else {
        setSelectedPhrases(new Set(filteredPhrases.map(p => p.phrase)));
      }
    }
  };

  // Filtered lists
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

  // Flashcards launcher
  const startFlashcards = () => {
    const deck = activeTab === 'words' 
      ? (selectedWords.size > 0 ? savedWords.filter(w => selectedWords.has(w.word)) : filteredWords).map(w => ({ ...w, cardType: 'word' }))
      : (selectedPhrases.size > 0 ? savedPhrases.filter(p => selectedPhrases.has(p.phrase)) : filteredPhrases).map(p => ({ ...p, cardType: 'phrase' }));
    
    if (deck.length === 0) return;
    setFlashcardDeck(deck);
    setFlashcardIndex(0);
    setIsFlipped(false);
    setCardAnimationKey(Date.now());
    setIsFlashcardMode(true);
  };

  const handleNextCard = () => {
    if (flashcardIndex < flashcardDeck.length - 1) {
      setIsFlipped(false);
      setFlashcardIndex(prev => prev + 1);
      setCardAnimationKey(Date.now());
    }
  };

  const handlePrevCard = () => {
    if (flashcardIndex > 0) {
      setIsFlipped(false);
      setFlashcardIndex(prev => prev - 1);
      setCardAnimationKey(Date.now());
    }
  };

  // Keyboard Shortcuts for Flashcards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFlashcardMode) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault(); 
          setIsFlipped(prev => !prev);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault(); 
          handleNextCard();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
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
  }, [isFlashcardMode, flashcardIndex, flashcardDeck]);

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

  // ==========================================
  // PRINT PDF FEATURE (Unified cross-tab, A4 Landscape)
  // ==========================================
  const handlePrintPdf = () => {
    // Gather words to print: use selection if any, else all filtered words
    const wordsToPrint = selectedWords.size > 0
      ? savedWords.filter(w => selectedWords.has(w.word))
      : (activeTab === 'words' ? filteredWords : []);

    // Gather phrases to print: use selection if any, else all filtered phrases
    const phrasesToPrint = selectedPhrases.size > 0
      ? savedPhrases.filter(p => selectedPhrases.has(p.phrase))
      : (activeTab === 'phrases' ? filteredPhrases : []);

    if (wordsToPrint.length === 0 && phrasesToPrint.length === 0) {
      alert(language === 'uz' ? "Chop etish uchun hech narsa tanlanmagan." : language === 'ru' ? "Ничего не выбрано для печати." : "No items to print.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(language === 'uz' ? "Chop etish uchun brauzerda pop-up oynalarga ruxsat bering." : language === 'ru' ? "Разрешите всплывающие окна для печати." : "Please allow pop-ups to print.");
      return;
    }

    const docTitle = language === 'uz'
      ? "DeutschBuddy - B2 Nemis tili lug'ati"
      : language === 'ru'
      ? "DeutschBuddy - Словарь немецкого B2"
      : "DeutschBuddy - German B2 Study Sheet";

    const dateStr = new Date().toLocaleDateString(
      language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    // ---- WORDS TABLE ----
    const wordsSection = wordsToPrint.length > 0 ? `
      <h2 class="section-title">
        ${language === 'uz' ? "1. B2 Wortschatz — So'zlar" : language === 'ru' ? "1. B2 Wortschatz — Слова" : "1. B2 Vocabulary — Words"}
        <span class="count-badge">${wordsToPrint.length}</span>
      </h2>
      <table>
        <thead>
          <tr>
            <th style="width:30px; text-align:center;">✓</th>
            <th style="width:22px; text-align:center;">#</th>
            <th>${language === 'uz' ? "Nemischa so'z" : language === 'ru' ? "Немецкое слово" : "German Word"}</th>
            <th style="width:70px;">${language === 'uz' ? "Turi" : language === 'ru' ? "Тип" : "Type"}</th>
            <th>${language === 'uz' ? "Grammatik shakli" : language === 'ru' ? "Грамматика" : "Grammar Forms"}</th>
            <th>${language === 'uz' ? "Ma'nosi" : language === 'ru' ? "Значение" : "Meaning"}</th>
            <th>${language === 'uz' ? "Misol" : language === 'ru' ? "Пример" : "Example"}</th>
          </tr>
        </thead>
        <tbody>
          ${wordsToPrint.map((w, idx) => `
            <tr>
              <td style="text-align:center; color:#94a3b8; font-size:13px;">☐</td>
              <td style="text-align:center; color:#94a3b8; font-size:10px;">${idx + 1}</td>
              <td style="font-weight:700; color:#0f172a; font-size:12px;">${w.word}</td>
              <td><span style="background:#f1f5f9; padding:2px 5px; border-radius:4px; font-size:9px; font-weight:600; color:#475569;">${w.type}</span></td>
              <td style="font-size:10px; color:#64748b; font-family:monospace;">${w.grammarForms || '-'}</td>
              <td style="font-weight:600; color:#4338ca; font-size:11px;">${w.meaning}</td>
              <td style="font-size:10px; color:#475569; font-style:italic;">${w.contextSentence ? `"${w.contextSentence}"` : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '';

    // ---- PHRASES TABLE (no literal translation column) ----
    const phrasesSection = phrasesToPrint.length > 0 ? `
      <h2 class="section-title" style="margin-top:${wordsToPrint.length > 0 ? '20px' : '0'};">
        ${language === 'uz' ? "2. B2 Redemittel — Iboralar" : language === 'ru' ? "2. B2 Redemittel — Фразы" : "2. B2 Redemittel & Phrases"}
        <span class="count-badge">${phrasesToPrint.length}</span>
      </h2>
      <table>
        <thead>
          <tr>
            <th style="width:30px; text-align:center;">✓</th>
            <th style="width:22px; text-align:center;">#</th>
            <th>${language === 'uz' ? "Nemischa ibora" : language === 'ru' ? "Немецкая фраза" : "German Phrase"}</th>
            <th>${language === 'uz' ? "Ma'nosi" : language === 'ru' ? "Значение" : "Meaning"}</th>
            <th>${language === 'uz' ? "Kontekst misol" : language === 'ru' ? "Пример" : "Example"}</th>
          </tr>
        </thead>
        <tbody>
          ${phrasesToPrint.map((p, idx) => `
            <tr>
              <td style="text-align:center; color:#94a3b8; font-size:13px;">☐</td>
              <td style="text-align:center; color:#94a3b8; font-size:10px;">${idx + 1}</td>
              <td style="font-weight:700; color:#0f172a; font-size:12px;">${p.phrase}</td>
              <td style="font-weight:600; color:#4338ca; font-size:11px;">${p.actualMeaning}</td>
              <td style="font-size:10px; color:#475569; font-style:italic;">${p.exampleSentence ? `"${p.exampleSentence}"` : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '';

    const totalItems = wordsToPrint.length + phrasesToPrint.length;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${docTitle}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm 12mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-bar {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-bottom: 2.5px solid #4338ca;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .brand-title {
              font-size: 18px;
              font-weight: 900;
              color: #1e1b4b;
              margin: 0;
            }
            .brand-sub {
              font-size: 10px;
              color: #64748b;
              margin-top: 2px;
              font-weight: 500;
            }
            .doc-info {
              text-align: right;
              font-size: 10px;
              color: #64748b;
            }
            .badge {
              display: inline-block;
              background: #e0e7ff;
              color: #3730a3;
              font-weight: 800;
              font-size: 9px;
              padding: 2px 7px;
              border-radius: 9999px;
              margin-bottom: 3px;
            }
            .section-title {
              font-size: 12px;
              font-weight: 800;
              color: #1e1b4b;
              margin: 0 0 8px 0;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .count-badge {
              background: #e0e7ff;
              color: #3730a3;
              font-size: 10px;
              font-weight: 700;
              padding: 1px 7px;
              border-radius: 9999px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            th {
              background-color: #f8fafc;
              color: #334155;
              font-weight: 700;
              text-align: left;
              padding: 6px 8px;
              border: 1px solid #cbd5e1;
              font-size: 10px;
            }
            td {
              padding: 5px 8px;
              border: 1px solid #e2e8f0;
              vertical-align: middle;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
            .footer-bar {
              margin-top: 14px;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <span class="badge">CEFR B2 • DeutschBuddy</span>
              <h1 class="brand-title">${docTitle}</h1>
              <p class="brand-sub">${totalItems} ${language === 'uz' ? "ta birlik saralangan" : language === 'ru' ? "единиц выбрано" : "items selected for study"}</p>
            </div>
            <div class="doc-info">
              <div>${language === 'uz' ? "Sana" : language === 'ru' ? "Дата" : "Date"}: <strong>${dateStr}</strong></div>
              <div>${language === 'uz' ? "Holat: Chop etish / PDF saqlash" : language === 'ru' ? "Статус: Печать / Сохранить PDF" : "Status: Print / Save as PDF"}</div>
            </div>
          </div>

          ${wordsSection}
          ${phrasesSection}

          <div class="footer-bar">
            <span>DeutschBuddy — Goethe-Zertifikat & telc B2</span>
            <span>${language === 'uz' ? "Jami" : language === 'ru' ? "Итого" : "Total"}: ${totalItems}</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  const currentCount = activeTab === 'words' ? filteredWords.length : filteredPhrases.length;

  const currentSelectedCount = activeTab === 'words' ? selectedWords.size : selectedPhrases.size;
  const totalCount = savedWords.length + savedPhrases.length;
  const isAllSelected = currentCount > 0 && currentSelectedCount === currentCount;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Dialog Card */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300 z-10">
        
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
                    {language === 'uz' ? "Mening lug'atim" : language === 'ru' ? "Мой словарь" : 'My Study Deck'}
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                      {totalCount}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                    {language === 'uz' ? "Bulutda (Firebase) avtomatik saqlangan" : language === 'ru' ? "Автосинхронизировано с облаком" : "Automatically synced to cloud"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Print PDF Button — cross-tab: shows combined selection count */}
                {(() => {
                  const combinedSelectedCount = selectedWords.size + selectedPhrases.size;
                  const printDisabled = savedWords.length === 0 && savedPhrases.length === 0;
                  return (
                    <button
                      onClick={handlePrintPdf}
                      disabled={printDisabled}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-sm"
                      title="PDF / Chop etish"
                    >
                      <Printer className="w-4 h-4 text-indigo-500" />
                      <span className="hidden sm:inline">{language === 'uz' ? 'Chop etish' : language === 'ru' ? 'Печать' : 'Print'}</span>
                      {combinedSelectedCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px]">
                          {combinedSelectedCount}
                        </span>
                      )}
                    </button>
                  );
                })()}

                {/* Flashcards Review Button */}
                <button 
                  onClick={startFlashcards}
                  disabled={currentCount === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                  title="Flashcards"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{language === 'uz' ? 'Mashq' : language === 'ru' ? 'Практика' : 'Practice'}</span>
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
            <div className="px-4 sm:px-6 pb-2.5 flex items-center justify-between gap-3">
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-full sm:w-auto border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
                <button 
                  onClick={() => handleTabChange('words')}
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
                  onClick={() => handleTabChange('phrases')}
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

            {/* Search Bar & Multi-Select Row */}
            <div className="px-4 sm:px-6 pb-3 flex items-center gap-3">
              <div className="relative flex-1">
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

              {currentCount > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0 transition-colors"
                  title="Select all"
                >
                  {isAllSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                  <span className="hidden sm:inline">{language === 'uz' ? 'Barchasi' : 'All'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body: Words / Phrases List or Flashcards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isFlashcardMode ? (
            /* ================= FLASHCARD 3D REVIEW MODE ================= */
            <div className="h-full flex flex-col justify-between py-1 animate-in fade-in zoom-in-95 duration-200 select-none">
              
              {/* Header: Exit & Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setIsFlashcardMode(false)} 
                    className="flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> {language === 'uz' ? 'Chiqish' : 'Exit'}
                  </button>

                  <div className="text-center">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                      {language === 'uz' ? 'B2 Kartochka Mashqi' : 'B2 Flashcard Session'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {flashcardIndex + 1} / {flashcardDeck.length}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setFlashcardIndex(0);
                      setCardAnimationKey(Date.now());
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                    title="Qayta boshlash"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${((flashcardIndex + 1) / flashcardDeck.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* 3D Animated Flip Card */}
              <div className="flex-1 flex items-center justify-center my-4 flashcard-scene">
                <div 
                  key={cardAnimationKey}
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`flashcard-card relative w-full max-w-md h-72 sm:h-80 cursor-pointer ${isFlipped ? 'flipped' : ''}`}
                >
                  {/* FRONT FACE (German) */}
                  <div className="flashcard-face flashcard-front absolute inset-0 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-2xl">
                    <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        🇩🇪 DEUTSCH
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {flashcardDeck[flashcardIndex].cardType === 'word' ? flashcardDeck[flashcardIndex].type : 'Redemittel'}
                      </span>
                    </div>

                    <div className="my-auto">
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                        {flashcardDeck[flashcardIndex].cardType === 'word' 
                          ? flashcardDeck[flashcardIndex].word 
                          : flashcardDeck[flashcardIndex].phrase}
                      </h3>
                      {flashcardDeck[flashcardIndex].grammarForms && (
                        <p className="mt-2.5 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-3 py-1 rounded-xl inline-block border border-slate-200 dark:border-slate-700">
                          {flashcardDeck[flashcardIndex].grammarForms}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400 text-xs font-bold tracking-wide">
                      <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
                      <span>{language === 'uz' ? "Tarjimani ko'rish uchun bosing" : 'Tap or press Space to flip'}</span>
                    </div>
                  </div>

                  {/* BACK FACE (Uzbek) */}
                  <div className="flashcard-face flashcard-back absolute inset-0 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-700 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-2xl">
                    <div className="w-full flex items-center justify-between text-xs font-bold text-indigo-200">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                        🇺🇿 O'ZBEKCHA
                      </span>
                      <span className="text-[10px] text-indigo-200">
                        {flashcardIndex + 1}/{flashcardDeck.length}
                      </span>
                    </div>

                    <div className="my-auto space-y-2">
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        {flashcardDeck[flashcardIndex].cardType === 'word' 
                          ? flashcardDeck[flashcardIndex].meaning 
                          : flashcardDeck[flashcardIndex].actualMeaning}
                      </h3>
                      
                      {(flashcardDeck[flashcardIndex].contextSentence || flashcardDeck[flashcardIndex].exampleSentence) && (
                        <p className="text-xs italic text-indigo-100 bg-black/20 p-3 rounded-2xl border border-white/10 max-h-24 overflow-y-auto leading-relaxed">
                          "{flashcardDeck[flashcardIndex].cardType === 'word' 
                            ? flashcardDeck[flashcardIndex].contextSentence 
                            : flashcardDeck[flashcardIndex].exampleSentence}"
                        </p>
                      )}
                    </div>

                    <div className="text-[11px] font-semibold text-indigo-200">
                      {language === 'uz' ? "Baholang yoki keyingi kartaga o'ting" : "Rate difficulty below"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation & Difficulty Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button 
                  onClick={handlePrevCard}
                  disabled={flashcardIndex === 0}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-200 disabled:opacity-30 active:scale-95 transition-all shadow-sm"
                  title="Oldingi karta"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex gap-2 flex-1 justify-center max-w-xs">
                  <button 
                    onClick={() => {
                      const item = flashcardDeck[flashcardIndex];
                      if (item.cardType === 'word') onUpdateWord(item.word, { difficulty: 'easy' });
                      handleNextCard();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white rounded-2xl text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-sm"
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
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-600 hover:text-white rounded-2xl text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-sm"
                  >
                    <Frown className="w-4 h-4" />
                    <span>{language === 'uz' ? 'Qiyin' : 'Hard'}</span>
                  </button>
                </div>

                <button 
                  onClick={handleNextCard}
                  disabled={flashcardIndex === flashcardDeck.length - 1}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-200 disabled:opacity-30 active:scale-95 transition-all shadow-sm"
                  title="Keyingi karta"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Completion Banner */}
              {flashcardIndex === flashcardDeck.length - 1 && isFlipped && (
                <div className="mt-3 p-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs font-bold animate-in fade-in">
                  <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                    <Award className="w-4 h-4 text-amber-500" />
                    {language === 'uz' ? "Mashq yakunlandi! Barakalla!" : "Session completed!"}
                  </span>
                  <button
                    onClick={() => setIsFlashcardMode(false)}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-xl active:scale-95"
                  >
                    {language === 'uz' ? 'Tugatish' : 'Done'}
                  </button>
                </div>
              )}
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
                      const isSelected = selectedWords.has(item.word);
                      return (
                        <div 
                          key={`${item.word}-${index}`} 
                          onClick={() => toggleSelectWord(item.word)}
                          className={`p-3 sm:p-4 rounded-2xl border transition-all duration-200 shadow-sm cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600' 
                              : 'bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            {/* Checkbox */}
                            <div className="pt-0.5 shrink-0 text-slate-400 dark:text-slate-500">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <Square className="w-4 h-4 hover:text-indigo-500" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                                  {item.word}
                                </h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${articleBadge.style}`}>
                                  {articleBadge.text}
                                </span>
                                {item.difficulty === 'hard' && (
                                  <span className="text-[9px] font-black text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/50">
                                    {language === 'uz' ? 'QIYIN' : 'HARD'}
                                  </span>
                                )}
                                {item.difficulty === 'easy' && (
                                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50">
                                    {language === 'uz' ? 'OSON' : 'EASY'}
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                                {item.meaning}
                              </p>

                              {item.grammarForms && (
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-300">
                                  {item.grammarForms}
                                </p>
                              )}

                              {item.contextSentence && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-1.5 line-clamp-2 border-l-2 border-indigo-500 pl-2">
                                  "{item.contextSentence}"
                                </p>
                              )}
                            </div>

                            {/* Card Actions: Easy/Hard toggle & Delete */}
                            <div className="flex items-center gap-1 shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm">
                                <button 
                                  onClick={() => onUpdateWord(item.word, { difficulty: item.difficulty === 'easy' ? undefined : 'easy' })} 
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    item.difficulty === 'easy' 
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                                      : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
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
                                      : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                                  }`} 
                                  title="Mark as Hard"
                                >
                                  <Frown className="w-4 h-4" />
                                </button>
                              </div>

                              <button 
                                onClick={() => onRemove(item.word)} 
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 rounded-xl transition-colors"
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
                      const isSelected = selectedPhrases.has(item.phrase);
                      return (
                        <div 
                          key={`${item.phrase}-${index}`} 
                          onClick={() => toggleSelectPhrase(item.phrase)}
                          className={`p-3 sm:p-4 rounded-2xl border transition-all duration-200 shadow-sm cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600' 
                              : 'bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2">
                              <div className="text-slate-400 dark:text-slate-500">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <Square className="w-4 h-4 hover:text-indigo-500" />
                                )}
                              </div>
                              <h3 className="font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                                {item.phrase}
                              </h3>
                            </div>

                            <button 
                              onClick={(e) => { e.stopPropagation(); onRemovePhrase(item.phrase); }} 
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 rounded-xl transition-colors shrink-0"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1 pl-6">
                            {item.actualMeaning}
                          </p>

                          {item.literalTranslation && (
                            <p className="text-xs text-slate-500 dark:text-slate-300 italic mb-1 pl-6">
                              {language === 'uz' ? "So'zma-so'z: " : "Literal: "}
                              "{item.literalTranslation}"
                            </p>
                          )}

                          {item.exampleSentence && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-xl mt-2 border border-slate-200/60 dark:border-slate-700/60 ml-6">
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
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/95 flex items-center justify-between gap-3 shrink-0">
          {showClearConfirm ? (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {language === 'uz' ? "Barchasini tozalaysizmi?" : "Clear all?"}
              </span>
              <button 
                onClick={() => { onClearAll(); setShowClearConfirm(false); setSelectedWords(new Set()); setSelectedPhrases(new Set()); }} 
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

          <div className="flex items-center gap-2">
            {!isFlashcardMode && currentCount > 0 && (
              <button
                onClick={handlePrintPdf}
                className="sm:hidden px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-500" />
                <span>PDF</span>
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

      {/* 3D Flashcard CSS Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .flashcard-scene {
          perspective: 1200px;
        }
        .flashcard-card {
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-style: preserve-3d;
        }
        .flashcard-card.flipped {
          transform: rotateY(180deg);
        }
        .flashcard-face {
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .flashcard-back {
          transform: rotateY(180deg);
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}} />
    </div>
  );
};

export default SavedWordsModal;
