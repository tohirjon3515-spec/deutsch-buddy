import React, { useState, useEffect } from 'react';
import { RotateCcw, X, Volume2, Loader2, StopCircle, Bookmark, BookmarkCheck } from 'lucide-react';
import { VocabItem } from '../types';
import { Language } from '../translations';

interface VocabTableProps {
  items: VocabItem[];
  savedWords?: VocabItem[];
  onToggleSave?: (item: VocabItem) => void;
  onPlayAudio: (text: string, id: string) => void;
  playingId: string | null;
  loadingId: string | null;
  language?: Language;
}

const GrammarParsedText: React.FC<{ text: string; language?: Language }> = ({ text, language = 'uz' }) => {
  const definitionsUz: Record<string, string> = {
    'Pl': "Ko'plik shakli (Plural)",
    'Prät': "Präteritum (O'tgan zamon - yozma nutqda)",
    'Part II': "Partizip II (O'tgan zamon sifatdoshi - Perfekt)",
    'Komp': "Komparativ (Qiyosiy daraja)",
    'Sup': "Superlativ (Orttirma daraja)",
    'Konj II': "Konjunktiv II (Faraz / istak mayli)",
    'Inf': "Infinitiv (Fe'lning boshlang'ich shakli)",
    'NVV': "Nomen-Verb-Verbindung (Ot va fe'l birikmasi - B2)",
    'Passiv': "Passiv / Passiv-Ersatzform (Majhul nisbat alternativasi)",
    'Akk': "Akkusativ (Tushum kelishigi)",
    'Dat': "Dativ (Jo'nalish kelishigi)",
    'Gen': "Genitiv (Qaratqich kelishigi)",
    'Präp': "Feste Präposition (Doimiy boshqaruvchi predlog)",
    'B2': "CEFR B2 darajadagi leksika"
  };

  const definitionsEn: Record<string, string> = {
    'Pl': 'Plural (More than one)',
    'Prät': 'Präteritum (Simple Past tense - mainly written)',
    'Part II': 'Partizip II (Past Participle - spoken past/perfect)',
    'Komp': 'Komparativ (Comparative)',
    'Sup': 'Superlativ (Superlative)',
    'Konj II': 'Konjunktiv II (Subjunctive - hypothetical)',
    'Inf': 'Infinitive (Basic form)',
    'NVV': 'Noun-Verb Collocation (Funktionsverbgefüge - B2)',
    'Passiv': 'Passive Voice / Passive Replacement',
    'Akk': 'Accusative Case',
    'Dat': 'Dative Case',
    'Gen': 'Genitive Case',
    'Präp': 'Fixed Preposition',
    'B2': 'CEFR B2 Vocabulary'
  };

  const definitions = language === 'uz' ? definitionsUz : definitionsEn;

  const pattern = new RegExp(`(${Object.keys(definitions).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const parts = text.split(pattern);

  return (
    <span>
      {parts.map((part, i) => {
        const def = definitions[part];
        if (def) {
          return (
            <span 
              key={i} 
              title={def}
              className="cursor-help border-b border-dotted border-slate-400 dark:border-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const VocabTable: React.FC<VocabTableProps> = ({ items, savedWords, onToggleSave, onPlayAudio, playingId, loadingId, language = 'uz' }) => {
  const [visibleItems, setVisibleItems] = useState<VocabItem[]>(items);

  useEffect(() => {
    setVisibleItems(items);
  }, [items]);

  const getTypeStyle = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('noun') || lowerType.includes('ot')) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    if (lowerType.includes('verb') || lowerType.includes("fe'l") || lowerType.includes('fel')) return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    if (lowerType.includes('adj') || lowerType.includes('sifat')) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
    return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const getIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('noun') || lowerType.includes('ot')) return '🟦';
    if (lowerType.includes('verb') || lowerType.includes("fe'l") || lowerType.includes('fel')) return '🟥';
    if (lowerType.includes('adj') || lowerType.includes('sifat')) return '🟩';
    return '🏷️';
  };

  const handleRemove = (index: number) => {
    const newItems = [...visibleItems];
    newItems.splice(index, 1);
    setVisibleItems(newItems);
  };
  const handleReset = () => setVisibleItems(items);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {language === 'uz' ? `${visibleItems.length} ta so'z ko'rinmoqda` : `${visibleItems.length} words visible`}
          </span>
          {visibleItems.length !== items.length && (
             <button onClick={handleReset} className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                <RotateCcw className="w-3 h-3" /> {language === 'uz' ? 'Tiklash' : 'Reset'}
             </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleItems.map((item, index) => {
          const itemId = `word-${index}-${item.word}`;
          const isPlaying = playingId === itemId;
          const isLoading = loadingId === itemId;
          const isSaved = savedWords?.some(w => w.word === item.word) ?? false;

          return (
            <div key={itemId} className={`group relative bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 ${isPlaying ? 'border-indigo-400 dark:border-indigo-500 ring-1 ring-indigo-400 dark:ring-indigo-500' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
              <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center gap-1">
                    <button onClick={() => onPlayAudio(item.word, itemId)} disabled={isLoading} className={`p-1 rounded-md transition-all duration-200 ${isPlaying ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <StopCircle className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    {onToggleSave && (
                      <button 
                        onClick={() => onToggleSave(item)}
                        className={`p-1 rounded-md transition-all duration-200 ${isSaved ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title={isSaved ? (language === 'uz' ? "Saqlanganlardan o'chirish" : "Remove from saved") : (language === 'uz' ? "So'zni saqlash" : "Save word")}
                      >
                        {isSaved ? <BookmarkCheck className="w-5 h-5 fill-amber-500 text-amber-500" /> : <Bookmark className="w-5 h-5" />}
                      </button>
                    )}
                 </div>
                 <button onClick={() => handleRemove(index)} className="text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{item.word}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getTypeStyle(item.type)}`}>
                        <span className="mr-1.5 text-[10px]">{getIcon(item.type)}</span>
                        {item.type}
                    </span>
                    {(item.cefrLevel === 'B2' || item.word.toLowerCase().includes('in betracht') || item.grammarForms?.includes('B2')) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        B2 Leksika
                      </span>
                    )}
                    {(item.isNVV || item.grammarForms?.includes('NVV')) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800" title="Nomen-Verb-Verbindung (Funktionsverbgefüge)">
                        NVV
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-50 dark:border-slate-800 space-y-2">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                      {language === 'uz' ? 'Grammatika' : 'Grammar'}
                    </div>
                    <GrammarParsedText text={item.grammarForms} language={language} />
                  </div>
                  <div className="text-sm">
                     <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                       {language === 'uz' ? "Ma'nosi (O'zbekcha)" : 'Meaning'}
                     </div>
                     <span className="text-slate-800 dark:text-slate-200 italic font-medium">{item.meaning}</span>
                  </div>
                  {item.contextSentence && (
                    <div className="text-sm mt-2">
                       <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                         {language === 'uz' ? 'Kontekstda' : 'Context'}
                       </div>
                       <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">"{item.contextSentence}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {visibleItems.length === 0 && (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
           <p className="text-slate-500 dark:text-slate-400 mb-2">
             {language === 'uz' ? "Barcha so'zlar ro'yxatdan olib tashlandi." : 'All words removed.'}
           </p>
           <button onClick={handleReset} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-2 mx-auto">
              <RotateCcw className="w-4 h-4" /> {language === 'uz' ? "Asl ro'yxatni tiklash" : 'Restore Original List'}
           </button>
        </div>
      )}
    </div>
  );
};

export default VocabTable;