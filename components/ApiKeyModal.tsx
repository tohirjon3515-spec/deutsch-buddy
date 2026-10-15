import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle2, Trash2, ExternalLink, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { getUserApiKey, setUserApiKey, removeUserApiKey } from '../services/geminiService';
import { Language } from '../translations';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyChange?: (hasKey: boolean) => void;
  language?: Language;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyChange,
  language = 'uz',
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync active key on modal open
  useEffect(() => {
    if (isOpen) {
      const stored = getUserApiKey();
      setActiveKey(stored);
      setApiKeyInput(stored || '');
      setStatusMessage(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = apiKeyInput.trim();

    if (!trimmed) {
      setStatusMessage({
        type: 'error',
        text: language === 'uz'
          ? "Iltimos, haqiqiy API kalitini kiriting!"
          : language === 'ru'
          ? "Пожалуйста, введите корректный ключ API!"
          : "Please enter a valid API key!",
      });
      return;
    }

    if (trimmed.length < 20) {
      setStatusMessage({
        type: 'error',
        text: language === 'uz'
          ? "API kaliti juda qisqa (kamida 20 ta belgidan iborat bo'lishi kerak)"
          : language === 'ru'
          ? "Ключ API слишком короткий (должен быть не менее 20 символов)"
          : "API key is too short (must be at least 20 characters)",
      });
      return;
    }

    setUserApiKey(trimmed);
    setActiveKey(trimmed);
    if (onKeyChange) onKeyChange(true);

    setStatusMessage({
      type: 'success',
      text: language === 'uz'
        ? "API kalit muvaffaqiyatli saqlandi va faollashtirildi!"
        : language === 'ru'
        ? "Ключ API успешно сохранен и активирован!"
        : "API key successfully saved and activated!",
    });
  };

  const handleClear = () => {
    removeUserApiKey();
    setActiveKey(null);
    setApiKeyInput('');
    if (onKeyChange) onKeyChange(false);

    setStatusMessage({
      type: 'success',
      text: language === 'uz'
        ? "Shaxsiy kalit tozalandi. Standart server kalitiga qaytildi."
        : language === 'ru'
        ? "Личный ключ удален. Возврат к стандартному серверному ключу."
        : "Personal key removed. Reverted to standard server key.",
    });
  };

  const maskedKeyDisplay = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••••••••••${key.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                {language === 'uz'
                  ? "Shaxsiy Gemini API Kaliti"
                  : language === 'ru'
                  ? "Персональный API-ключ Gemini"
                  : "Personal Gemini API Key"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'uz'
                  ? "Cheklovlar va Rate Limit muammosini hal qiling"
                  : language === 'ru'
                  ? "Решите проблему лимитов запросов (Rate Limits)"
                  : "Bypass shared rate limits with your own key"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status notification if active key exists */}
        {activeKey ? (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  {language === 'uz'
                    ? "✓ Shaxsiy API kalitingiz faol"
                    : language === 'ru'
                    ? "✓ Ваш личный API-ключ активен"
                    : "✓ Your personal API key is active"}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                  {maskedKeyDisplay(activeKey)}
                </p>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                  {language === 'uz'
                    ? "Barcha so'rovlar (tahlil, audio, mashqlar) sizning shaxsiy kvotangiz orqali amalga oshirilmoqda."
                    : language === 'ru'
                    ? "Все запросы (анализ, аудио, упражнения) используют вашу личную квоту."
                    : "All requests (analysis, audio, exercises) use your personal quota."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-xl transition-colors shrink-0"
              title={language === 'uz' ? "Kalitni o'chirish" : "Clear key"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="mt-5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {language === 'uz'
                ? "Hozirda standart umumiy server kvotasi ishlatilmoqda. Yuqori talab vaqtida limitga tushib qolmaslik uchun o'z kalitingizni kiriting."
                : language === 'ru'
                ? "Сейчас используется общий серверный лимит. Добавьте свой ключ, чтобы избежать ошибок 429 / Rate Limit."
                : "Currently using standard server quota. Add your key to avoid 429 rate limit errors."}
            </span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {language === 'uz'
                ? "Google Gemini API Kaliti:"
                : language === 'ru'
                ? "Ключ Google Gemini API:"
                : "Google Gemini API Key:"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 pr-11 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Alert feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>
                {language === 'uz' ? "Saqlash" : language === 'ru' ? "Сохранить" : "Save Key"}
              </span>
            </button>

            {activeKey && (
              <button
                type="button"
                onClick={handleClear}
                className="py-3 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-2xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {language === 'uz' ? "O'chirish" : language === 'ru' ? "Удалить" : "Clear"}
                </span>
              </button>
            )}
          </div>
        </form>

        {/* Security & Link Section */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {language === 'uz'
                ? "Kalit faqat sizning brauzeringizda (localStorage) xavfsiz saqlanadi va so'rovlar uchun shifrlangan tarzda uzatiladi."
                : language === 'ru'
                ? "Ключ надежно сохраняется только в вашем браузере (localStorage) и передается исключительно для ваших запросов."
                : "Key is saved securely in your browser's localStorage and only transmitted in your requests."}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'uz'
                  ? "Gemini API kaliti yo'qmi?"
                  : language === 'ru'
                  ? "Нет API-ключа Gemini?"
                  : "Need a Gemini API Key?"}
              </span>
              <span className="text-slate-400 text-[11px]">
                {language === 'uz'
                  ? "Google AI Studio orqali bepul oling (1 daqiqa)"
                  : language === 'ru'
                  ? "Получите бесплатно в Google AI Studio (1 мин)"
                  : "Get one for free at Google AI Studio"}
              </span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm transition-all shrink-0"
            >
              <span>{language === 'uz' ? "Kalit olish" : language === 'ru' ? "Получить ключ" : "Get API Key"}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
