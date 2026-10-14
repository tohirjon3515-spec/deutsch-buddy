
import React, { useState, useMemo, useEffect } from 'react';
import { X, Trash2, BookOpenCheck, Search, AlertCircle, Smile, Frown, ArrowDownUp, Download, CheckSquare, Square, Sparkles, BookOpen, Plus, Import, Wand2, Loader2, Check, FileDown, Printer, Play, RotateCcw, ChevronLeft, ChevronRight, Eye, Upload } from 'lucide-react';
import { VocabItem, PhraseItem } from '../types';
import { importVocabularyMagic } from '../services/geminiService';
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
  onImportWords: (words: VocabItem[]) => void;
  onImportPhrases: (phrases: PhraseItem[]) => void;
  language?: Language;
}

const ITEMS_PER_PAGE = 14;

const SavedWordsModal: React.FC<SavedWordsModalProps> = ({ 
  isOpen, 
  onClose, 
  savedWords, 
  savedPhrases, 
  onRemove, 
  onRemovePhrase, 
  onClearAll, 
  onUpdateWord, 
  onImportWords,
  onImportPhrases,
  language = 'uz' 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [sortMode, setSortMode] = useState<'date' | 'hard' | 'easy'>('date');
  const [activeTab, setActiveTab] = useState<'words' | 'phrases' | 'import'>('words');
  
  const [importText, setImportText] = useState('');
  const [isMagicImporting, setIsMagicImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [selectedPhrases, setSelectedPhrases] = useState<Set<string>>(new Set());

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
    const q = searchQuery.toLowerCase();
    const filtered = savedWords.filter(item => 
      item.word.toLowerCase().includes(q) || 
      item.meaning.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
    );

    return filtered.sort((a, b) => {
        if (sortMode === 'date') return 0;
        const getScore = (d?: 'easy' | 'hard') => {
            if (d === 'hard') return 3;
            if (d === 'easy') return 1;
            return 2;
        };
        const scoreA = getScore(a.difficulty);
        const scoreB = getScore(b.difficulty);
        if (sortMode === 'hard') return scoreB - scoreA;
        if (sortMode === 'easy') return scoreA - scoreB;
        return 0;
    });
  }, [savedWords, searchQuery, sortMode]);

  const filteredPhrases = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return savedPhrases.filter(p => 
      p.phrase.toLowerCase().includes(q) || 
      p.actualMeaning.toLowerCase().includes(q) ||
      p.explanation.toLowerCase().includes(q)
    );
  }, [savedPhrases, searchQuery]);

  const printWords = useMemo(() => {
    return selectedWords.size > 0 
      ? savedWords.filter(w => selectedWords.has(w.word))
      : filteredWords;
  }, [savedWords, filteredWords, selectedWords]);

  const printPhrases = useMemo(() => {
    return selectedPhrases.size > 0
      ? savedPhrases.filter(p => selectedPhrases.has(p.phrase))
      : filteredPhrases;
  }, [savedPhrases, filteredPhrases, selectedPhrases]);

  const printChunks = useMemo(() => {
    const items = activeTab === 'words' ? printWords : printPhrases;
    const chunks = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
        chunks.push(items.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks.length > 0 ? chunks : [[]];
  }, [activeTab, printWords, printPhrases]);

  const toggleWordSelection = (word: string) => {
    const newSelection = new Set(selectedWords);
    if (newSelection.has(word)) newSelection.delete(word);
    else newSelection.add(word);
    setSelectedWords(newSelection);
  };

  const togglePhraseSelection = (phrase: string) => {
    const newSelection = new Set(selectedPhrases);
    if (newSelection.has(phrase)) newSelection.delete(phrase);
    else newSelection.add(phrase);
    setSelectedPhrases(newSelection);
  };

  const toggleSelectAll = () => {
    if (activeTab === 'words') {
        if (selectedWords.size === filteredWords.length && filteredWords.length > 0) {
            setSelectedWords(new Set());
        } else {
            setSelectedWords(new Set(filteredWords.map(w => w.word)));
        }
    } else if (activeTab === 'phrases') {
        if (selectedPhrases.size === filteredPhrases.length && filteredPhrases.length > 0) {
            setSelectedPhrases(new Set());
        } else {
            setSelectedPhrases(new Set(filteredPhrases.map(p => p.phrase)));
        }
    }
  };

  const startFlashcards = () => {
    let deck: any[] = [];
    if (activeTab === 'words') {
      const selection = selectedWords.size > 0 ? filteredWords.filter(w => selectedWords.has(w.word)) : filteredWords;
      deck = selection.map(w => ({ ...w, cardType: 'word' }));
    } else {
      const selection = selectedPhrases.size > 0 ? filteredPhrases.filter(p => selectedPhrases.has(p.phrase)) : filteredPhrases;
      deck = selection.map(p => ({ ...p, cardType: 'phrase' }));
    }
    
    if (deck.length === 0) return;
    
    // Shuffle deck
    setFlashcardDeck([...deck].sort(() => Math.random() - 0.5));
    setFlashcardIndex(0);
    setIsFlipped(false);
    setIsFlashcardMode(true);
  };

  const handleMagicImport = async () => {
    setImportError(null);
    const text = importText.trim();

    // Validation
    if (!text) {
      setImportError("Please enter text to import.");
      return;
    }
    if (text.length < 5) {
      setImportError("Input is too short. Please add more content.");
      return;
    }
    // Basic check for letters (prevents numbers-only input)
    if (!/[a-zA-Z\u00C0-\u00FF]/.test(text)) {
      setImportError("Input must contain words or letters.");
      return;
    }

    setIsMagicImporting(true);
    try {
      const items = await importVocabularyMagic(text, language === 'en' ? 'en' : 'uz');
      if (!items || items.length === 0) {
        throw new Error("No vocabulary identified");
      }
      onImportWords(items);
      setImportText('');
      setActiveTab('words');
    } catch (err) {
      console.error(err);
      setImportError(
        language === 'uz'
          ? "Nemischa so'zlarni aniqlab bo'lmadi. Iltimos, ro'yxatni to'g'ri kiritganingizni tekshiring."
          : "We couldn't identify German vocabulary. Please ensure your list is clear and formatted correctly."
      );
    } finally {
      setIsMagicImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!Array.isArray(data)) throw new Error("Invalid format");

        const newWords: VocabItem[] = [];
        const newPhrases: PhraseItem[] = [];

        data.forEach((item: any) => {
           if (item.type === 'word') {
              // Backward compatibility: If originalType is missing, infer from grammar
              let type = item.originalType || 'Word';
              if (!item.originalType) {
                  const g = (item.grammar || '').toLowerCase();
                  if (g.includes('der') || g.includes('die') || g.includes('das')) type = 'Noun';
                  else if (g.includes('to ')) type = 'Verb';
              }

              newWords.push({
                 word: item.target,
                 meaning: item.translation,
                 grammarForms: item.grammar,
                 contextSentence: item.context,
                 type: type,
                 difficulty: 'easy'
              });
           } else if (item.type === 'phrase') {
              newPhrases.push({
                 phrase: item.target,
                 actualMeaning: item.translation,
                 literalTranslation: item.literal || '',
                 exampleSentence: item.context,
                 explanation: item.explanation || '',
                 difficulty: 'Intermediate'
              });
           }
        });

        if (newWords.length > 0) onImportWords(newWords);
        if (newPhrases.length > 0) onImportPhrases(newPhrases);
        
        alert(`Successfully imported ${newWords.length} words and ${newPhrases.length} phrases.`);
        setActiveTab(newWords.length > 0 ? 'words' : 'phrases');
        // Reset the input so the same file can be selected again if needed
        event.target.value = '';
        
      } catch (err) {
        setImportError("Failed to parse file. Ensure it is a valid DeutschBuddy JSON export.");
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadFlashcards = () => {
    let exportData: any[] = [];
    
    if (activeTab === 'words') {
        const wordsToExport = savedWords.filter(w => selectedWords.has(w.word));
        exportData = wordsToExport.map(item => ({
            target: item.word,
            translation: item.meaning,
            grammar: item.grammarForms,
            context: item.contextSentence || "",
            type: "word",
            originalType: item.type // Persist original type for re-importing
        }));
    } else if (activeTab === 'phrases') {
        const phrasesToExport = savedPhrases.filter(p => selectedPhrases.has(p.phrase));
        exportData = phrasesToExport.map(item => ({
            target: item.phrase,
            translation: item.actualMeaning,
            literal: item.literalTranslation,
            context: item.exampleSentence || "",
            explanation: item.explanation,
            type: "phrase"
        }));
    }

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `deutschbuddy_${activeTab}_export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGenderClass = (item: VocabItem) => {
    const t = item.type.toLowerCase();
    const w = item.word.toLowerCase();
    
    // Check for explicit markers or articles
    if (t.includes('(m)') || t.includes('masc') || w.startsWith('der ')) return 'text-blue';
    if (t.includes('(f)') || t.includes('fem') || w.startsWith('die ')) return 'text-red';
    if (t.includes('(n)') || t.includes('neut') || w.startsWith('das ')) return 'text-green';
    
    return '';
  };

  const handlePrintPdf = () => {
    const printContent = document.getElementById('printable-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print.");
        return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>DeutschBuddy Vocabulary List</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              margin: 0; 
              padding: 0; 
              background: #f1f5f9; 
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
              color: #0f172a; 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .print-page {
               width: 210mm;
               height: 297mm;
               padding: 20mm;
               margin: 20px auto;
               background: white;
               box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
               box-sizing: border-box;
               page-break-after: always;
               position: relative;
               display: flex;
               flex-direction: column;
            }

            @media print {
               body { background: white; margin: 0; }
               .print-page {
                  margin: 0;
                  box-shadow: none;
                  page-break-after: always;
                  height: 297mm;
                  width: 210mm;
               }
            }
            
            h1 { font-size: 24px; font-weight: 900; margin: 0; line-height: 1.2; color: #1e293b; }
            p { margin: 0; color: #64748b; font-size: 14px; }
            header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; flex-shrink: 0; }
            
            .content-wrapper { flex: 1; overflow: hidden; }
            
            table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
            th { background-color: #f8fafc; text-align: left; padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #334155; }
            td { padding: 10px; border: 1px solid #e2e8f0; vertical-align: top; color: #334155; overflow-wrap: break-word; }
            
            .font-bold { font-weight: 700; color: #0f172a; }
            .italic { font-style: italic; }
            .text-sm { font-size: 11px; }
            .text-xs { font-size: 10px; }
            
            /* Checkbox Column */
            .checkbox-col { width: 40px; text-align: center; vertical-align: middle; }
            .checkbox-symbol { font-size: 18px; color: #cbd5e1; }

            /* Gender Colors */
            .text-blue { color: #1d4ed8 !important; }   /* Masculine */
            .text-red { color: #b91c1c !important; }    /* Feminine */
            .text-green { color: #15803d !important; }  /* Neuter */
            
            footer { margin-top: auto; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 10px; color: #94a3b8; flex-shrink: 0; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
             window.onload = function() {
                setTimeout(function() {
                    window.print();
                    // window.close(); // Optional: Close after print
                }, 500);
             }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  const currentItemsCount = activeTab === 'words' ? filteredWords.length : activeTab === 'phrases' ? filteredPhrases.length : 0;
  const currentSelectedCount = activeTab === 'words' ? selectedWords.size : activeTab === 'phrases' ? selectedPhrases.size : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* PRINT CONTAINER - Chunks items into pages for A4 formatting */}
      <div id="printable-content" className="hidden">
          {printChunks.map((chunk, pageIndex) => (
             <div key={pageIndex} className="print-page">
                <header>
                   <div>
                     <h1>DeutschBuddy Vocabulary</h1>
                     <p>Generated on {new Date().toLocaleDateString()}</p>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <p className="text-xs font-bold uppercase">
                        {activeTab === 'words' ? 'Words & Grammar' : 'Phrases & Idioms'}
                      </p>
                      <p className="text-xs text-slate-400">Page {pageIndex + 1} of {printChunks.length}</p>
                   </div>
                </header>

                <div className="content-wrapper">
                  {activeTab === 'words' && (
                    <table>
                      <thead>
                        <tr>
                          <th className="checkbox-col">Check</th>
                          <th style={{ width: '20%' }}>Word</th>
                          <th style={{ width: '10%' }}>Type</th>
                          <th style={{ width: '15%' }}>Grammar</th>
                          <th style={{ width: '20%' }}>Meaning</th>
                          <th style={{ width: '30%' }}>Context / Sentence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(chunk as VocabItem[]).map((w, i) => (
                          <tr key={i}>
                            <td className="checkbox-col"><span className="checkbox-symbol">☐</span></td>
                            <td className={`font-bold ${getGenderClass(w)}`}>{w.word}</td>
                            <td className="text-sm">{w.type}</td>
                            <td className="text-sm italic">{w.grammarForms}</td>
                            <td>{w.meaning}</td>
                            <td className="text-xs italic">{w.contextSentence}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'phrases' && (
                    <table>
                      <thead>
                        <tr>
                          <th className="checkbox-col">Check</th>
                          <th style={{ width: '25%' }}>German Phrase</th>
                          <th style={{ width: '25%' }}>Meaning</th>
                          <th style={{ width: '35%' }}>Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(chunk as PhraseItem[]).map((p, i) => (
                          <tr key={i}>
                            <td className="checkbox-col"><span className="checkbox-symbol">☐</span></td>
                            <td className="font-bold">{p.phrase}</td>
                            <td className="text-sm font-bold">{p.actualMeaning}</td>
                            <td className="text-xs italic">{p.exampleSentence}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                
                <footer>
                  DeutschBuddy AI Tutor &bull; Master B1 German &bull; Page {pageIndex + 1}/{printChunks.length}
                </footer>
             </div>
          ))}
      </div>

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl min-h-[500px] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Modal Header */}
        {!isFlashcardMode && (
          <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between p-6 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                        <BookOpenCheck className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {language === 'uz' ? 'Mening lug\'atim' : 'My Study Deck'}
                        <span className="ml-3 text-sm font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {savedWords.length + savedPhrases.length}
                        </span>
                    </h2>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 flex gap-2 overflow-x-auto scrollbar-none">
                <button 
                  onClick={() => setActiveTab('words')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'words' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <BookOpen className="w-4 h-4" /> {language === 'uz' ? `So'zlar (${savedWords.length})` : `Words (${savedWords.length})`}
                </button>
                <button 
                  onClick={() => setActiveTab('phrases')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'phrases' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Sparkles className="w-4 h-4" /> {language === 'uz' ? `Iboralar (${savedPhrases.length})` : `Idioms (${savedPhrases.length})`}
                </button>
                <button 
                  onClick={() => setActiveTab('import')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'import' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Import className="w-4 h-4" /> {language === 'uz' ? 'Import / Tiklash' : 'Import / Restore'}
                </button>
            </div>
            
            {activeTab !== 'import' && (
              <div className="px-6 py-4 flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                              type="text" 
                              placeholder={language === 'uz' ? 'Lug\'atdan qidirish...' : 'Filter your deck...'} 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {activeTab === 'words' && (
                            <div className="relative flex-1 sm:flex-none">
                                <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <select
                                    value={sortMode}
                                    onChange={(e) => setSortMode(e.target.value as any)}
                                    className="pl-9 pr-8 py-2 w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                >
                                    <option value="date">{language === 'uz' ? 'Qo\'shilgan (Odatiy)' : 'Added (Default)'}</option>
                                    <option value="hard">{language === 'uz' ? 'Qiyinlari oldin' : 'Hardest First'}</option>
                                    <option value="easy">{language === 'uz' ? 'Osonlari oldin' : 'Easiest First'}</option>
                                </select>
                            </div>
                        )}
                        <button 
                          onClick={startFlashcards}
                          disabled={currentItemsCount === 0}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          {language === 'uz' ? 'Kartochkalar (Flashcards)' : 'Review'}
                        </button>
                      </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                     <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {currentSelectedCount > 0 && currentSelectedCount === currentItemsCount ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        <span>{language === 'uz' ? `Barchasini tanlash (${currentItemsCount})` : `Select All (${currentItemsCount})`}</span>
                     </button>
                     <div className="flex items-center gap-2">
                        {currentItemsCount > 0 && (
                          <button 
                            onClick={handlePrintPdf}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all shadow-sm active:scale-95"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            {currentSelectedCount > 0 ? (language === 'uz' ? 'Tanlanganlarni chop etish' : 'Print Selection') : (language === 'uz' ? 'Ro\'yxatni chop etish' : 'Print List')}
                          </button>
                        )}
                        {currentSelectedCount > 0 && (
                          <button 
                            onClick={handleDownloadFlashcards}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {language === 'uz' ? `JSON eksport (${currentSelectedCount})` : `Export JSON (${currentSelectedCount})`}
                          </button>
                        )}
                        <span className="text-xs text-slate-400">
                          {language === 'uz' ? `${currentSelectedCount} ta tanlandi` : `${currentSelectedCount} selected`}
                        </span>
                     </div>
                  </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className={`flex-1 overflow-y-auto p-6 relative ${isFlashcardMode ? 'scrollbar-none' : 'scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700'}`}>
          {isFlashcardMode ? (
            <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
               {/* Flashcard Header */}
               <div className="flex items-center justify-between mb-8">
                  <button onClick={() => setIsFlashcardMode(false)} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> {language === 'uz' ? 'Chiqish (Esc)' : 'Exit Session (Esc)'}
                  </button>
                  <div className="text-center">
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest block">
                      {language === 'uz' ? 'Kartochka mashqi' : 'Review Session'}
                    </span>
                    <span className="text-sm font-bold text-slate-400">{flashcardIndex + 1} / {flashcardDeck.length}</span>
                  </div>
                  <div className="w-20" /> {/* Spacer */}
               </div>

               {/* The Card */}
               <div className="flex-1 flex items-center justify-center perspective-1000 mb-8">
                  <div 
                    onClick={() => setIsFlipped(!isFlipped)}
                    className={`relative w-full max-w-sm h-72 cursor-pointer transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 bg-white dark:bg-slate-800 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 backface-hidden">
                       <span className="text-[10px] uppercase font-bold text-indigo-400 mb-4 tracking-widest">
                         {language === 'uz' ? 'Nemischa' : 'German'}
                       </span>
                       <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 text-center leading-tight">
                         {flashcardDeck[flashcardIndex].cardType === 'word' ? flashcardDeck[flashcardIndex].word : flashcardDeck[flashcardIndex].phrase}
                       </h3>
                       {flashcardDeck[flashcardIndex].cardType === 'word' && (
                         <span className="mt-2 text-sm text-slate-400 font-mono">{flashcardDeck[flashcardIndex].grammarForms}</span>
                       )}
                       <div className="mt-8 flex items-center gap-2 text-slate-300 text-xs font-bold uppercase">
                          <Eye size={14} /> {language === 'uz' ? 'Aylantirish uchun bosing yoki [Probel]' : 'Tap or [Space] to flip'}
                       </div>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 bg-indigo-600 text-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 rotate-y-180 backface-hidden">
                       <span className="text-[10px] uppercase font-bold text-indigo-200 mb-4 tracking-widest">
                         {language === 'uz' ? 'O\'zbekcha ma\'nosi' : 'Translation'}
                       </span>
                       <h3 className="text-2xl font-black text-center leading-tight">
                         {flashcardDeck[flashcardIndex].cardType === 'word' ? flashcardDeck[flashcardIndex].meaning : flashcardDeck[flashcardIndex].actualMeaning}
                       </h3>
                       {flashcardDeck[flashcardIndex].explanation && (
                         <p className="mt-4 text-xs text-indigo-100 text-center italic line-clamp-3">
                           {flashcardDeck[flashcardIndex].explanation}
                         </p>
                       )}
                       <div className="mt-8 p-3 bg-white/10 rounded-xl border border-white/20">
                          <p className="text-[10px] uppercase font-bold text-indigo-200 mb-1">
                            {language === 'uz' ? 'Misol' : 'Example'}
                          </p>
                          <p className="text-xs font-medium leading-relaxed">
                            "{flashcardDeck[flashcardIndex].cardType === 'word' ? flashcardDeck[flashcardIndex].contextSentence : flashcardDeck[flashcardIndex].exampleSentence}"
                          </p>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Navigation Controls */}
               <div className="flex items-center justify-center gap-6 mb-4">
                  <button 
                    onClick={handlePrevCard}
                    disabled={flashcardIndex === 0}
                    className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full hover:bg-slate-200 disabled:opacity-30 transition-all"
                    title={language === 'uz' ? 'Oldingi karta [ArrowLeft]' : 'Previous Card [ArrowLeft]'}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const item = flashcardDeck[flashcardIndex];
                        if (item.cardType === 'word') onUpdateWord(item.word, { difficulty: 'easy' });
                        handleNextCard();
                      }}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-800 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Smile className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        {language === 'uz' ? 'Oson' : 'Easy'}
                      </span>
                    </button>

                    <button 
                      onClick={() => {
                        const item = flashcardDeck[flashcardIndex];
                        if (item.cardType === 'word') onUpdateWord(item.word, { difficulty: 'hard' });
                        handleNextCard();
                      }}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-800 group-hover:bg-rose-500 group-hover:text-white transition-all">
                        <Frown className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        {language === 'uz' ? 'Qiyin' : 'Hard'}
                      </span>
                    </button>
                  </div>

                  <button 
                    onClick={handleNextCard}
                    disabled={flashcardIndex === flashcardDeck.length - 1}
                    className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full hover:bg-slate-200 disabled:opacity-30 transition-all"
                    title={language === 'uz' ? 'Keyingi karta [ArrowRight]' : 'Next Card [ArrowRight]'}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
               </div>
               
               {/* Exit / Completion */}
               {flashcardIndex === flashcardDeck.length - 1 && isFlipped && (
                 <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                    <button onClick={() => setIsFlashcardMode(false)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all">
                       {language === 'uz' ? 'Mashqni yakunlash' : 'Finish Session'}
                    </button>
                 </div>
               )}
            </div>
          ) : activeTab === 'import' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* RESTORE FROM FILE */}
              <div className="space-y-3">
                 <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                    <Upload className="w-5 h-5" />
                    <h3 className="font-bold">
                      {language === 'uz' ? 'Zaxira fayldan tiklash (JSON)' : 'Restore from Backup'}
                    </h3>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-center group">
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden" 
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                       <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6 text-indigo-500" />
                       </div>
                       <div className="space-y-1">
                         <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                           {language === 'uz' ? 'JSON faylni yuklash uchun bosing' : 'Click to upload JSON'}
                         </p>
                         <p className="text-xs text-slate-500 dark:text-slate-400">
                           {language === 'uz' ? 'Avval eksport qilingan DeutschBuddy lug\'atini tiklang' : 'Restore a previously downloaded DeutschBuddy deck'}
                         </p>
                       </div>
                    </label>
                 </div>
              </div>

              <div className="relative flex items-center py-2">
                <div className="grow border-t border-slate-200 dark:border-slate-700"></div>
                <span className="shrink-0 mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {language === 'uz' ? 'YOKI' : 'OR'}
                </span>
                <div className="grow border-t border-slate-200 dark:border-slate-700"></div>
              </div>

              {/* MAGIC AI IMPORT */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                   <Wand2 className="w-5 h-5" />
                   <h3 className="font-bold">
                     {language === 'uz' ? 'Sehrli AI Import' : 'Magic AI Import'}
                   </h3>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                   <p className="text-sm text-indigo-700 dark:text-indigo-400 leading-relaxed">
                     {language === 'uz'
                       ? "Nemischa so'zlarni kiriting. Gemini AI ularning o'zbekcha tarjimasi, artikllari va grammatikasini avtomatik aniqlaydi."
                       : "Paste raw notes or word lists. Gemini will structure them into your deck automatically."}
                   </p>
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    if (importError) setImportError(null);
                  }}
                  placeholder={language === 'uz' ? "Masalan:\nder Tisch\nschreiben\nschön\ndas Buch" : "Example: Haus, Katze, laufen..."}
                  className={`w-full h-32 p-4 bg-slate-50 dark:bg-slate-950 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500/20 outline-none dark:text-slate-100 ${importError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 dark:border-slate-800'}`}
                />
                {importError && (
                  <div className="flex items-center gap-2 text-sm text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
                     <AlertCircle className="w-4 h-4" />
                     {importError}
                  </div>
                )}
                <button 
                  onClick={handleMagicImport}
                  disabled={isMagicImporting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  {isMagicImporting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> {language === 'uz' ? 'Tahlil qilinmoqda...' : 'Analyzing...'}</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> {language === 'uz' ? 'AI bilan import qilish' : 'Import Now'}</>
                  )}
                </button>
              </div>

            </div>
          ) : (activeTab === 'words' ? savedWords : savedPhrases).length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <p className="text-lg font-medium mb-2">
                {language === 'uz' 
                  ? (activeTab === 'words' ? "Hozircha saqlangan so'zlar yo'q" : "Hozircha saqlangan iboralar yo'q")
                  : `No ${activeTab} saved yet`}
              </p>
              <p className="text-sm">
                {language === 'uz'
                  ? "Keyinroq mashq qilish va takrorlash uchun xatcho'p (bookmark) belgisini bosing."
                  : "Click the bookmark icon to save items for later practice."}
              </p>
            </div>
          ) : currentItemsCount === 0 ? (
             <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <p className="text-lg font-medium">
                {language === 'uz' ? "Hech narsa topilmadi" : "No matches found"}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeTab === 'words' ? (
                filteredWords.map((item, index) => {
                  const isSelected = selectedWords.has(item.word);
                  return (
                    <div key={`${item.word}-${index}`} className={`group flex items-start sm:items-center p-3 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer ${isSelected ? 'border-indigo-400 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-900/10' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'} hover:border-indigo-300 dark:hover:border-indigo-700`} onClick={() => toggleWordSelection(item.word)}>
                      <div className={`mr-4 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent group-hover:border-indigo-400'}`}>
                          <Check className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{item.word}</h3>
                          <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">{item.type}</span>
                          {item.difficulty === 'hard' && <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-800">{language === 'uz' ? 'QIYIN' : 'HARD'}</span>}
                          {item.difficulty === 'easy' && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">{language === 'uz' ? 'OSON' : 'EASY'}</span>}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 font-mono text-xs">{item.grammarForms} <span className="italic ml-2 text-slate-800 dark:text-slate-200">{item.meaning}</span></div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                            <button onClick={() => onUpdateWord(item.word, { difficulty: item.difficulty === 'easy' ? undefined : 'easy' })} className={`p-1.5 rounded-md transition-colors ${item.difficulty === 'easy' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title={language === 'uz' ? "Oson deb belgilash" : "Mark as Easy"}><Smile className="w-4 h-4" /></button>
                            <button onClick={() => onUpdateWord(item.word, { difficulty: item.difficulty === 'hard' ? undefined : 'hard' })} className={`p-1.5 rounded-md transition-colors ${item.difficulty === 'hard' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title={language === 'uz' ? "Qiyin deb belgilash" : "Mark as Hard"}><Frown className="w-4 h-4" /></button>
                        </div>
                        <button onClick={() => onRemove(item.word)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  );
                })
              ) : (
                filteredPhrases.map((item, index) => {
                  const isSelected = selectedPhrases.has(item.phrase);
                  return (
                    <div key={`${item.phrase}-${index}`} className={`group flex flex-col p-4 rounded-xl border transition-all duration-200 cursor-pointer ${isSelected ? 'border-indigo-400 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-900/10' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'} hover:border-indigo-300 dark:hover:border-indigo-700`} onClick={() => togglePhraseSelection(item.phrase)}>
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent'}`}>
                                <Check className="w-3.5 h-3.5 fill-current" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{item.phrase}</h3>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); onRemovePhrase(item.phrase); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                      <div className="pl-8 space-y-1">
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{item.actualMeaning}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {language === 'uz' ? "So'zma-so'z: " : "Literal: "}
                          {item.literalTranslation}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            {showClearConfirm ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 w-full sm:w-auto justify-center">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {language === 'uz' ? "Lug'atni tozalaysizmi?" : "Clear deck?"}
                    </span>
                    <button onClick={() => { onClearAll(); setShowClearConfirm(false); setSelectedWords(new Set()); setSelectedPhrases(new Set()); }} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-bold ml-2">
                      {language === 'uz' ? 'Ha, tozalash' : 'Yes, Clear'}
                    </button>
                    <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md text-xs">
                      {language === 'uz' ? 'Bekor qilish' : 'Cancel'}
                    </button>
                </div>
            ) : (
                 <button onClick={() => (savedWords.length + savedPhrases.length) > 0 ? setShowClearConfirm(true) : null} disabled={(savedWords.length + savedPhrases.length) === 0} className={`text-sm font-medium transition-colors w-full sm:w-auto text-center ${(savedWords.length + savedPhrases.length) === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:text-red-600'}`}>
                   {language === 'uz' ? "Lug'atni tozalash" : "Empty Deck"}
                 </button>
            )}
         
          <div className="flex items-center gap-3 w-full sm:w-auto">
             {!isFlashcardMode && activeTab !== 'import' && (
               <button onClick={handleDownloadFlashcards} disabled={currentSelectedCount === 0} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm w-full sm:w-auto ${currentSelectedCount === 0 ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md'}`}>
                <Download className="w-4 h-4" />
                <span>JSON Export ({currentSelectedCount})</span>
              </button>
             )}
              <button onClick={onClose} className="px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 font-medium text-sm transition-colors w-full sm:w-auto">
                {language === 'uz' ? 'Yopish' : 'Close'}
              </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};

export default SavedWordsModal;
