import React, { useMemo } from 'react';
import {
  X,
  TrendingUp,
  Bookmark,
  Calendar,
  Volume2,
} from 'lucide-react';
import { HistoryRecord } from '../services/firebase';
import { VocabItem, PhraseItem } from '../types';
import { Language } from '../translations';
import { generateSpeech } from '../services/geminiService';

interface ProgressDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryRecord[];
  savedWords: VocabItem[];
  savedPhrases?: PhraseItem[];
  onSelectSentence: (text: string) => void;
  onOpenSavedModal: () => void;
  language?: Language;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  isOpen,
  onClose,
  history,
  savedWords,
  onOpenSavedModal,
  language = 'uz',
}) => {
  // 1. So'nggi 7 kunlik tahlillar
  const weeklyData = useMemo(() => {
    const today = new Date();
    const days: { label: string; dateStr: string; count: number; isToday: boolean }[] = [];

    const dayNamesUz = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const count = history.filter((item) => {
        if (!item.createdAt) return false;
        const itemD = new Date(item.createdAt);
        return itemD >= d && itemD < nextD;
      }).length;

      const dayIdx = d.getDay();
      days.push({
        label: language === 'uz' ? dayNamesUz[dayIdx] : dayNamesEn[dayIdx],
        dateStr: `${d.getDate()}.${d.getMonth() + 1}`,
        count,
        isToday: i === 0,
      });
    }

    const totalThisWeek = days.reduce((sum, d) => sum + d.count, 0);
    const maxInWeek = Math.max(...days.map((d) => d.count), 1);
    const activeDays = days.filter((d) => d.count > 0).length;

    return { days, totalThisWeek, maxInWeek, activeDays };
  }, [history, language]);

  // 2. So'zlar statistikasi
  const wordsStats = useMemo(() => {
    const total = savedWords.length;
    const nouns = savedWords.filter((w) => (w.type || '').toLowerCase().includes('subst') || (w.type || '').toLowerCase().includes('ot')).length;
    const verbs = savedWords.filter((w) => (w.type || '').toLowerCase().includes('verb') || (w.type || '').toLowerCase().includes("fe'l")).length;
    const adjs = savedWords.filter((w) => (w.type || '').toLowerCase().includes('adj') || (w.type || '').toLowerCase().includes('sifat')).length;

    return { total, nouns, verbs, adjs };
  }, [savedWords]);

  const handlePlayWord = async (text: string) => {
    try {
      const base64Audio = await generateSpeech(text);
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (ctx.state === 'suspended') await ctx.resume();
      const int16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, int16.length, 24000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < int16.length; i++) {
        channel[i] = int16[i] / 32768.0;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {language === 'uz' ? "Faollik va Natijalar" : 'Activity & Stats'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'uz'
                  ? "Haftalik tahlillar va saqlangan so'zlaringiz bo'yicha aniq ma'lumotlar"
                  : 'Weekly activity and saved words statistics'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 2 ta aniq statistika kartochkasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                {language === 'uz' ? "Haftalik tahlillar" : 'This Week'}
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {weeklyData.totalThisWeek}{' '}
                <span className="text-sm font-semibold text-slate-500">
                  {language === 'uz' ? 'ta matn' : 'texts'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'uz'
                  ? `So'nggi 7 kunda (${weeklyData.activeDays} kun faol)`
                  : `${weeklyData.activeDays} active days this week`}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                {language === 'uz' ? "Saqlangan so'zlar" : 'Saved Words'}
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {wordsStats.total}{' '}
                <span className="text-sm font-semibold text-slate-500">
                  {language === 'uz' ? "ta so'z" : 'words'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'uz'
                  ? `Otlar: ${wordsStats.nouns} | Fe'llar: ${wordsStats.verbs} | Sifatlar: ${wordsStats.adjs}`
                  : `Nouns: ${wordsStats.nouns} | Verbs: ${wordsStats.verbs} | Adjs: ${wordsStats.adjs}`}
              </p>
            </div>
          </div>

          {/* 1. Haftalik faollik (kunma-kun aniq sonlar) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {language === 'uz' ? "So'nggi 7 kunlik faollik jadvali" : 'Daily Analyses (Last 7 Days)'}
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {language === 'uz' ? `Jami: ${history.length} ta tahlil` : `Total: ${history.length} analyses`}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              {weeklyData.days.map((day, i) => {
                const heightPercent =
                  day.count > 0 ? Math.max(25, Math.round((day.count / weeklyData.maxInWeek) * 100)) : 8;

                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {day.count > 0 ? `${day.count} ta` : '-'}
                    </span>

                    <div className="w-full max-w-[36px] bg-slate-100 dark:bg-slate-700 rounded-xl h-24 p-1 flex flex-col justify-end">
                      <div
                        className={`w-full rounded-lg transition-all ${
                          day.count > 0
                            ? day.isToday
                              ? 'bg-indigo-600'
                              : 'bg-indigo-400'
                            : 'bg-transparent'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    <span
                      className={`text-xs font-bold ${
                        day.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day.label}
                    </span>
                    <span className="text-[10px] text-slate-400">{day.dateStr}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Saqlangan so'zlar ro'yxati */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Bookmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {language === 'uz' ? "Saqlangan so'zlar ro'yxati" : 'Saved Words'}
              </h3>
              {savedWords.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenSavedModal}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {language === 'uz' ? "Barchasini ko'rish" : 'View all'} ({savedWords.length})
                </button>
              )}
            </div>

            {savedWords.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {savedWords.slice(0, 6).map((word, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block truncate">
                        {word.word}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                        {word.meaning}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePlayWord(word.word)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0"
                      title="Audio"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                {language === 'uz'
                  ? "Hozircha saqlangan so'zlar yo'q. Matn tahlil qilinganda so'zlarni saqlashingiz mumkin."
                  : 'No saved words yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {language === 'uz'
              ? `Jami tahlillar tarixi: ${history.length} ta yozuv`
              : `Total history records: ${history.length}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl text-xs"
          >
            {language === 'uz' ? 'Yopish' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;
