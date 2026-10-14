import React from 'react';
import { X, History, Trash2, ArrowRight, Clock, FileText, Sparkles, BookOpen } from 'lucide-react';
import { HistoryRecord } from '../services/firebase';
import { Language } from '../translations';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryRecord[];
  onSelect: (text: string) => void;
  onDelete: (id: string) => void;
  isLoggedIn: boolean;
  onSignIn: () => void;
  language?: Language;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelect,
  onDelete,
  isLoggedIn,
  onSignIn,
  language = 'uz',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {language === 'uz' ? 'Tahlillar tarixi' : 'Analysis History'}
                <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {history.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {isLoggedIn 
                  ? (language === 'uz' ? 'Cloud Firestore bulutli bazasida xavfsiz saqlanmoqda' : 'Synced securely with Cloud Firestore')
                  : (language === 'uz' ? 'Tarixingiz barcha qurilmalarda saqlanishi uchun Google orqali kiring' : 'Sign in to sync your search and analysis history across devices')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {!isLoggedIn ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  {language === 'uz' ? 'Tarixni bulutda saqlash o\'chiq' : 'History sync is offline'}
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                  {language === 'uz'
                    ? "Tahlil qilgan nemischa gaplaringiz va lug'atlaringiz Cloud Firestore bazasida saqlanishi uchun Google orqali kiring."
                    : 'Sign in with Google to automatically save your German text analyses and vocabulary decks to Cloud Firestore.'}
                </p>
              </div>
              <button
                onClick={onSignIn}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {language === 'uz' ? 'Google orqali kirish' : 'Sign in with Google'}
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-600 dark:text-slate-400">
                {language === 'uz' ? 'Hozircha tahlillar saqlanmagan' : 'No analyses recorded yet'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'uz' ? 'Nemischa matn yoki gap tahlil qilganingizda, u avtomatik tarzda bu yerda paydo bo\'ladi.' : 'Analyze a German sentence or paragraph to have it saved here automatically.'}
              </p>
            </div>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                className="group p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { onSelect(record.text); onClose(); }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      record.mode === 'paragraph' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                      {record.mode === 'paragraph' ? (language === 'uz' ? 'Matn' : 'paragraph') : (language === 'uz' ? 'Gap' : 'sentence')}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {record.createdAt ? new Date(record.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (language === 'uz' ? 'Yaqinda' : 'Recently')}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 line-clamp-2">
                    {record.text}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1 mt-1">
                    "{record.translation}"
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-1">
                  <button
                    onClick={() => { onSelect(record.text); onClose(); }}
                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950 rounded-lg transition-colors"
                    title={language === 'uz' ? 'Matnni tahlil oynasiga yuklash' : 'Load text into analyzer'}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(record.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title={language === 'uz' ? 'O\'chirish' : 'Delete record'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
