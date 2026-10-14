
import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Lightbulb, Volume2, Loader2, PlayCircle, StopCircle, Moon, Sun, Bookmark, BookmarkCheck, Sparkles, Gamepad2, FileText, Check, Search, BrainCircuit, MessageSquare, Info, Maximize, Minimize, Key, ExternalLink, Download, Quote, Languages, HelpCircle, GraduationCap, ClipboardCheck, ArrowRight, Layers, Link2, LogOut, Cloud, History, User as UserIcon, AlertCircle, Award, TrendingUp, BarChart3 } from 'lucide-react';
import { analyzeGermanText, generateSpeech, checkApiKeySelection, openApiKeySelection } from './services/geminiService';
import { AnalysisResult, AnalysisStatus, VocabItem, PhraseItem } from './types';
import { Language, translations } from './translations';
import VocabTable from './components/VocabTable';
import ResultCard from './components/ResultCard';
import SavedWordsModal from './components/SavedWordsModal';
import ExerciseArena from './components/ExerciseArena';
import LivePractice from './components/LivePractice';
import HistoryModal from './components/HistoryModal';
import ProgressDashboard from './components/ProgressDashboard';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  unsubscribeAllFirestoreListeners,
  syncUserProfile,
  subscribeSavedWords,
  subscribeSavedPhrases,
  subscribeHistory,
  saveWordToFirestore,
  deleteWordFromFirestore,
  updateWordInFirestore,
  clearAllWordsInFirestore,
  batchSaveWordsToFirestore,
  savePhraseToFirestore,
  deletePhraseFromFirestore,
  clearAllPhrasesInFirestore,
  batchSavePhrasesToFirestore,
  saveHistoryRecord,
  deleteHistoryRecord,
  HistoryRecord,
} from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

// Audio decoding helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('deutschbuddy_lang');
      return (saved === 'en' || saved === 'uz') ? saved : 'uz';
    } catch {
      return 'uz';
    }
  });
  const t = translations[language];

  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [useSearch, setUseSearch] = useState(false);
  const [useThinking, setUseThinking] = useState(false);

  const [savedWords, setSavedWords] = useState<VocabItem[]>([]);
  const [savedPhrases, setSavedPhrases] = useState<PhraseItem[]>([]);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [isLiveOpen, setIsLiveOpen] = useState(false);

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // 1. Firebase Authentication & Real-time Firestore Sync
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const cleanupActiveSubscriptions = () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // ignore teardown error
        }
      });
      unsubs = [];
      unsubscribeAllFirestoreListeners();
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      cleanupActiveSubscriptions();
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (user) {
        setSyncToast("Connected to Google & Cloud Firestore");
        setTimeout(() => setSyncToast(null), 3000);

        try {
          await syncUserProfile(user);
        } catch (e) {
          console.error("Profile sync error:", e);
        }

        // One-time migration of local storage items into Firestore
        const localWordsStr = localStorage.getItem('deutschBuddy_savedWords');
        const localPhrasesStr = localStorage.getItem('deutschBuddy_savedPhrases');
        if (localWordsStr) {
          try {
            const lw: VocabItem[] = JSON.parse(localWordsStr);
            if (Array.isArray(lw) && lw.length > 0) {
              await batchSaveWordsToFirestore(user.uid, lw);
            }
          } catch (e) {
            console.error("Migration error for words:", e);
          }
        }
        if (localPhrasesStr) {
          try {
            const lp: PhraseItem[] = JSON.parse(localPhrasesStr);
            if (Array.isArray(lp) && lp.length > 0) {
              await batchSavePhrasesToFirestore(user.uid, lp);
            }
          } catch (e) {
            console.error("Migration error for phrases:", e);
          }
        }

        // Real-time Firestore listeners
        const unsubWords = subscribeSavedWords(user.uid, (words) => {
          setSavedWords(words);
        });
        const unsubPhrases = subscribeSavedPhrases(user.uid, (phrases) => {
          setSavedPhrases(phrases);
        });
        const unsubHistory = subscribeHistory(user.uid, (history) => {
          setHistoryList(history);
        });

        unsubs = [unsubWords, unsubPhrases, unsubHistory];
      }
    });

    return () => {
      cleanupActiveSubscriptions();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await checkApiKeySelection();
      setHasApiKey(selected);
    };
    checkKey();
    
    const storedWords = localStorage.getItem('deutschBuddy_savedWords');
    const storedPhrases = localStorage.getItem('deutschBuddy_savedPhrases');
    const storedHistory = localStorage.getItem('deutschBuddy_history');
    if (storedWords) {
      try { setSavedWords(JSON.parse(storedWords)); } catch (e) { console.error(e); }
    }
    if (storedPhrases) {
      try { setSavedPhrases(JSON.parse(storedPhrases)); } catch (e) { console.error(e); }
    }
    if (storedHistory) {
      try { setHistoryList(JSON.parse(storedHistory)); } catch (e) { console.error(e); }
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
        return;
      }
      
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => console.error("Error entering fullscreen:", err));
        } else {
          document.exitFullscreen().catch(err => console.error("Error exiting fullscreen:", err));
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('deutschBuddy_savedWords', JSON.stringify(savedWords));
  }, [savedWords]);

  useEffect(() => {
    localStorage.setItem('deutschBuddy_savedPhrases', JSON.stringify(savedPhrases));
  }, [savedPhrases]);

  useEffect(() => {
    localStorage.setItem('deutschBuddy_history', JSON.stringify(historyList));
  }, [historyList]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsAuthLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setError("Sign-in was cancelled or encountered an issue.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      unsubscribeAllFirestoreListeners();
      await signOutUser();
      setSyncToast("Signed out. Switched to local storage.");
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };

  const handleToggleSave = async (item: VocabItem) => {
    const exists = savedWords.some(w => w.word === item.word);
    if (exists) {
      setSavedWords(prev => prev.filter(w => w.word !== item.word));
      if (currentUser) {
        try { await deleteWordFromFirestore(currentUser.uid, item.word); } catch (e) { console.error(e); }
      }
    } else {
      setSavedWords(prev => [...prev, item]);
      if (currentUser) {
        try { await saveWordToFirestore(currentUser.uid, item); } catch (e) { console.error(e); }
      }
    }
  };

  const handleToggleSavePhrase = async (item: PhraseItem) => {
    const exists = savedPhrases.some(p => p.phrase === item.phrase);
    if (exists) {
      setSavedPhrases(prev => prev.filter(p => p.phrase !== item.phrase));
      if (currentUser) {
        try { await deletePhraseFromFirestore(currentUser.uid, item.phrase); } catch (e) { console.error(e); }
      }
    } else {
      setSavedPhrases(prev => [...prev, item]);
      if (currentUser) {
        try { await savePhraseToFirestore(currentUser.uid, item); } catch (e) { console.error(e); }
      }
    }
  };

  const handleUpdateSavedWord = async (word: string, updates: Partial<VocabItem>) => {
    setSavedWords(prev => prev.map(item => item.word === word ? { ...item, ...updates } : item));
    if (currentUser) {
      try { await updateWordInFirestore(currentUser.uid, word, updates); } catch (e) { console.error(e); }
    }
  };

  const handleRemoveWord = async (word: string) => {
    setSavedWords(prev => prev.filter(x => x.word !== word));
    if (currentUser) {
      try { await deleteWordFromFirestore(currentUser.uid, word); } catch (e) { console.error(e); }
    }
  };

  const handleRemovePhrase = async (phrase: string) => {
    setSavedPhrases(prev => prev.filter(x => x.phrase !== phrase));
    if (currentUser) {
      try { await deletePhraseFromFirestore(currentUser.uid, phrase); } catch (e) { console.error(e); }
    }
  };

  const handleClearAll = async () => {
    setSavedWords([]);
    setSavedPhrases([]);
    if (currentUser) {
      try {
        await clearAllWordsInFirestore(currentUser.uid);
        await clearAllPhrasesInFirestore(currentUser.uid);
      } catch (e) { console.error(e); }
    }
  };

  const handleImportWords = async (words: VocabItem[]) => {
    setSavedWords(prev => [...prev, ...words]);
    if (currentUser) {
      try { await batchSaveWordsToFirestore(currentUser.uid, words); } catch (e) { console.error(e); }
    }
  };

  const handleImportPhrases = async (phrases: PhraseItem[]) => {
    setSavedPhrases(prev => [...prev, ...phrases]);
    if (currentUser) {
      try { await batchSavePhrasesToFirestore(currentUser.uid, phrases); } catch (e) { console.error(e); }
    }
  };

  const handleDeleteHistory = async (id: string) => {
    setHistoryList(prev => prev.filter(x => x.id !== id));
    if (currentUser) {
      try {
        await deleteHistoryRecord(currentUser.uid, id);
      } catch (e) {
        console.error("Error deleting history record:", e);
      }
    }
  };

  const handleAnalyze = async (langOverride?: Language) => {
    if (!inputText.trim()) return;
    const activeLang: Language = (langOverride === 'en' || langOverride === 'uz')
      ? langOverride
      : language;
    stopAudio();
    setStatus(AnalysisStatus.LOADING);
    setError(null);
    try {
      const data = await analyzeGermanText(inputText, useSearch, useThinking, activeLang);
      setResult(data);
      setStatus(AnalysisStatus.SUCCESS);
      
      const newHistoryItem: HistoryRecord = {
        id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser?.uid || 'local',
        text: inputText,
        mode: data.mode,
        translation: data.translation,
        createdAt: new Date().toISOString(),
        grammarTopic: data.grammarSpotlight?.topic,
        detectedStructures: data.b2Highlights?.detectedStructures,
        vocabCount: data.vocabulary?.length || 0,
      };

      setHistoryList(prev => [newHistoryItem, ...prev.filter(x => x.text !== inputText)]);

      if (currentUser) {
        try {
          await saveHistoryRecord(currentUser.uid, {
            text: inputText,
            mode: data.mode,
            translation: data.translation,
            grammarTopic: data.grammarSpotlight?.topic,
            detectedStructures: data.b2Highlights?.detectedStructures,
            vocabCount: data.vocabulary?.length || 0,
          });
        } catch (hErr) {
          console.warn("Could not save record to history:", hErr);
        }
      }
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(
        err?.message || (activeLang === 'uz' ? "Kechirasiz! Matnni tahlil qilib bo'lmadi." : "Entschuldigung! I couldn't analyze that text.")
      );
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleLanguageChange = (newLang: Language) => {
    if (newLang === language) return;
    setLanguage(newLang);
    try {
      localStorage.setItem('deutschbuddy_lang', newLang);
    } catch (e) {}

    // If text is already analyzed, re-run analysis immediately with new language so all cards update
    if (inputText.trim() && result) {
      handleAnalyze(newLang);
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    setPlayingAudioId(null);
    setLoadingAudioId(null);
  };

  const playAudio = async (text: string, id: string) => {
    if (playingAudioId === id) { stopAudio(); return; }
    stopAudio();
    setLoadingAudioId(id);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      const base64Audio = await generateSpeech(text);
      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => { setPlayingAudioId(null); sourceRef.current = null; };
      sourceRef.current = source;
      source.start(0);
      setPlayingAudioId(id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudioId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) handleAnalyze();
  };

  const isPhraseSaved = (phrase: string) => savedPhrases.some(p => p.phrase === phrase);

  const getDifficultyStyles = (difficulty: string) => {
    switch(difficulty) {
      case 'Advanced': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800';
      case 'Intermediate': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800';
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/30 dark:from-slate-950 dark:to-slate-900 pb-20 transition-colors duration-300 ease-in-out text-slate-900 dark:text-slate-100">
      <SavedWordsModal 
        isOpen={isSavedModalOpen} 
        onClose={() => setIsSavedModalOpen(false)} 
        savedWords={savedWords} 
        savedPhrases={savedPhrases}
        onRemove={handleRemoveWord}
        onRemovePhrase={handleRemovePhrase}
        onClearAll={handleClearAll}
        onUpdateWord={handleUpdateSavedWord}
        onImportWords={handleImportWords}
        onImportPhrases={handleImportPhrases}
        language={language}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={historyList}
        onSelect={(txt) => setInputText(txt)}
        onDelete={async (id) => {
          if (currentUser) {
            try { await deleteHistoryRecord(currentUser.uid, id); } catch (e) { console.error(e); }
          }
          setHistoryList(prev => prev.filter(h => h.id !== id));
        }}
        isLoggedIn={!!currentUser}
        onSignIn={handleGoogleSignIn}
        language={language}
      />

      {syncToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Cloud className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{syncToast}</span>
        </div>
      )}

      <nav className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* ZONE 1: BRAND & LOGO (LEFT) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-xl shadow-md shadow-indigo-500/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 dark:from-indigo-400 dark:to-violet-400 leading-tight tracking-tight">
                  DeutschBuddy
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/80 tracking-wider">
                  CEFR B2
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium hidden md:inline leading-none">
                {t.brandSubtitle}
              </span>
            </div>
          </div>

          {/* ZONE 2: LEARNING TOOLS ISLAND (CENTER) */}
          <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
            {/* Saved Words / Phrases */}
            <button
              onClick={() => setIsSavedModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700/70 transition-all duration-200"
              title={t.saved}
            >
              <Bookmark className="w-4 h-4 text-amber-500" />
              <span className="hidden md:inline">{t.saved}</span>
              {(savedWords.length + savedPhrases.length > 0) && (
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                  {savedWords.length + savedPhrases.length}
                </span>
              )}
            </button>

            {/* B2 Progress Dashboard */}
            <button
              onClick={() => setIsProgressOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700/70 transition-all duration-200"
              title={t.progressTitle}
            >
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="hidden md:inline">{t.progress}</span>
              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                B2
              </span>
            </button>

            {/* Analysis History */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700/70 transition-all duration-200"
              title={t.history}
            >
              <History className="w-4 h-4 text-indigo-500" />
              <span className="hidden md:inline">{t.history}</span>
              {historyList.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40">
                  {historyList.length}
                </span>
              )}
            </button>

            {/* Live Audio / Voice Practice */}
            <button
              onClick={() => setIsLiveOpen(!isLiveOpen)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                isLiveOpen
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700/70'
              }`}
              title={t.liveSpeaking}
            >
              <MessageSquare className={`w-4 h-4 ${isLiveOpen ? 'text-white' : 'text-indigo-500'}`} />
              <span className="hidden lg:inline">{t.liveSpeaking}</span>
            </button>
          </div>

          {/* ZONE 3: UTILITIES & AUTH (RIGHT) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Segmented Language Switcher */}
            <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => handleLanguageChange('uz')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === 'uz'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                title="O'zbek tiliga o'tish"
              >
                <span>🇺🇿</span>
                <span className="hidden sm:inline">UZ</span>
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === 'en'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                title="Switch to English"
              >
                <span>🇬🇧</span>
                <span className="hidden sm:inline">EN</span>
              </button>
            </div>

            {/* Display / Theme Toggles */}
            <div className="flex items-center">
              <button
                onClick={toggleFullscreen}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title={isDarkMode ? 'Light mode' : 'Dark mode'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            </div>

            {/* Google Authentication & Firestore Sync */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-800">
                <div
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  title={`Signed in as ${currentUser.email} • Synced to Cloud Firestore`}
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-indigo-200 dark:border-indigo-700 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="hidden xl:flex flex-col text-left leading-tight">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                      {currentUser.displayName || (language === 'uz' ? "Nemis tili o'quvchisi" : 'Deutsch Learner')}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Cloud className="w-2.5 h-2.5" /> {t.synced}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                  title={t.signOut}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95"
                title="Google login"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="hidden sm:inline">{t.googleLogin}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <section className="mb-12">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> {t.analysisTitle}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={useSearch} onChange={() => setUseSearch(!useSearch)} className="sr-only" />
                    <div className={`w-10 h-5 rounded-full transition-colors ${useSearch ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${useSearch ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">{t.searchToggle}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={useThinking} onChange={() => setUseThinking(!useThinking)} className="sr-only" />
                    <div className={`w-10 h-5 rounded-full transition-colors ${useThinking ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${useThinking ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-violet-600 transition-colors">{t.thinkingToggle}</span>
                </label>
              </div>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              className="w-full h-32 bg-transparent text-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 resize-none focus:outline-none transition-colors duration-300"
            />

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400">{t.ctrlEnterHint}</p>
              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={status === AnalysisStatus.LOADING || !inputText.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-md shadow-indigo-600/20"
              >
                {status === AnalysisStatus.LOADING ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {status === AnalysisStatus.LOADING ? t.analyzing : t.analyzeButton}
              </button>
            </div>

            {/* Visible error message if analysis fails */}
            {status === AnalysisStatus.ERROR && error && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start justify-between gap-3 text-rose-700 dark:text-rose-300 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <p className="font-bold text-sm">
                      {language === 'uz' ? 'Tahlil qilishda xatolik:' : 'Analysis error:'}
                    </p>
                    <p className="text-sm opacity-90 mt-0.5">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0"
                >
                  {language === 'uz' ? 'Qayta urinish' : 'Retry'}
                </button>
              </div>
            )}
          </div>
        </section>

        {status === AnalysisStatus.SUCCESS && result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Linguistic Insights Card (Paragraph Mode) */}
            {result.mode === 'paragraph' && result.linguisticInsights && (
               <ResultCard title={t.linguisticInsightsTitle} icon={<Layers className="w-5 h-5" />}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <div>
                           <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-2">
                              <Info className="w-3.5 h-3.5" /> {t.logicalConnectors}
                           </h3>
                           <div className="flex flex-wrap gap-2">
                              {result.linguisticInsights.connectors.map((c, i) => (
                                 <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{c.word}</span>
                                    <span className="text-[10px] text-indigo-400/80 italic">{c.function}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                        <div>
                           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">{t.coreThemes}</h3>
                           <div className="flex flex-wrap gap-2">
                              {result.linguisticInsights.themes.map((theme, i) => (
                                 <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {theme}
                                 </span>
                              ))}
                           </div>
                        </div>
                     </div>
                     <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t.stylisticObservation}</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                           "{result.linguisticInsights.stylisticNote}"
                        </p>
                     </div>
                  </div>
               </ResultCard>
            )}

            <ResultCard title={t.translationAudioTitle} icon={<Volume2 className="w-5 h-5" />}>
              <div className="space-y-4">
                <p className="text-xl leading-relaxed text-slate-800 dark:text-slate-200 italic font-medium">
                  "{result.translation}"
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => playAudio(inputText, 'main')} 
                    disabled={loadingAudioId === 'main'}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${playingAudioId === 'main' ? 'bg-red-500 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'}`}
                  >
                    {loadingAudioId === 'main' ? <Loader2 className="w-5 h-5 animate-spin" /> : playingAudioId === 'main' ? <StopCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                    {t.listenAudio}
                  </button>
                </div>
                {result.sources && result.sources.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-500 mb-2">{t.groundingSources}</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs hover:bg-indigo-100 transition-colors border border-indigo-100 dark:border-indigo-800">
                          {s.title} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ResultCard>

            {result.vocabulary && result.vocabulary.length > 0 && (
              <ResultCard title={t.vocabBreakdownTitle} icon={<BookOpen className="w-5 h-5" />}>
                <VocabTable 
                  items={result.vocabulary} 
                  savedWords={savedWords} 
                  onToggleSave={handleToggleSave}
                  onPlayAudio={playAudio}
                  playingId={playingAudioId}
                  loadingId={loadingAudioId}
                  language={language}
                />
              </ResultCard>
            )}

            {result.phrases && result.phrases.length > 0 && (
              <ResultCard 
                title={t.collocationsTitle} 
                icon={<Sparkles className="w-5 h-5" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.phrases.map((phrase, i) => {
                    const saved = isPhraseSaved(phrase.phrase);
                    const phraseId = `phrase-${i}`;
                    return (
                      <div key={i} className="group relative flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        {/* Header Area */}
                        <div className="p-6 pb-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getDifficultyStyles(phrase.difficulty)}`}>
                                {phrase.difficulty}
                              </span>
                              {phrase.category && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 tracking-wider">
                                  {phrase.category}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => playAudio(phrase.phrase, phraseId)} className={`p-2 rounded-xl transition-colors ${playingAudioId === phraseId ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-100'}`} title={language === 'uz' ? "Tinglash" : "Listen"}>
                                <Volume2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleSavePhrase(phrase)}
                                className={`p-2 rounded-xl transition-all duration-200 ${
                                  saved
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                }`}
                                title={saved ? (language === 'uz' ? "Saqlanganlardan o'chirish" : "Remove from saved") : (language === 'uz' ? "Iborani saqlash" : "Save phrase")}
                              >
                                {saved ? <BookmarkCheck className="w-4 h-4 fill-amber-500 text-amber-500" /> : <Bookmark className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                            {phrase.phrase}
                          </h3>
                        </div>

                        {/* Translation Section */}
                        <div className="px-6 pb-6 space-y-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30">
                              <Languages size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-indigo-400 dark:text-indigo-500">{t.meaning}</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{phrase.actualMeaning}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                              <Quote className="w-4 h-4 text-slate-400 shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-slate-400">{t.literalFlip}</span>
                                <span className="text-sm italic text-slate-500 dark:text-slate-400">"{phrase.literalTranslation}"</span>
                              </div>
                            </div>
                          </div>

                          {/* Insight Section */}
                          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                             <div className="flex items-start gap-2">
                                <HelpCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                  {phrase.explanation}
                                </p>
                             </div>
                             <div className="bg-slate-900 dark:bg-black p-4 rounded-2xl">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">{t.inContext}</span>
                                <p className="text-xs font-medium text-slate-100 leading-relaxed">
                                  "{phrase.exampleSentence}"
                                </p>
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ResultCard>
            )}
          </div>
        )}

        {status === AnalysisStatus.IDLE && (
          <div className="py-16 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-black uppercase tracking-wider mb-1">
              <Award className="w-4 h-4 text-amber-500" />
              <span>{t.b2Badge}</span>
            </div>
            <div>
              <div className="inline-flex p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-2 shadow-inner">
                <Sparkles className="w-12 h-12" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 max-w-xl mx-auto">
              {t.heroTitle}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed text-base">
              {t.heroSubtitle}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8 text-left">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-fit">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{t.feature1Title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.feature1Desc}</p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 w-fit">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{t.feature2Title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.feature2Desc}</p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 w-fit">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{t.feature3Title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.feature3Desc}</p>
              </div>
            </div>

            {/* Quick Entry to Visual Progress Dashboard */}
            <div className="max-w-4xl mx-auto pt-4">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      {t.progressTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.progressSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProgressOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-md shrink-0 flex items-center gap-1.5"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>{language === 'uz' ? "Dashbordni ochish" : "Open Dashboard"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isLiveOpen && <LivePractice language={language} />}

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={historyList}
        onSelect={(text) => {
          setInputText(text);
          setIsHistoryOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onDelete={handleDeleteHistory}
        isLoggedIn={!!currentUser}
        onSignIn={handleGoogleSignIn}
        language={language}
      />

      <SavedWordsModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedWords={savedWords}
        savedPhrases={savedPhrases}
        onRemove={handleRemoveWord}
        onRemovePhrase={handleRemovePhrase}
        onClearAll={handleClearAll}
        onUpdateWord={handleUpdateSavedWord}
        onImportWords={handleImportWords}
        onImportPhrases={handleImportPhrases}
        language={language}
      />

      <ProgressDashboard
        isOpen={isProgressOpen}
        onClose={() => setIsProgressOpen(false)}
        history={historyList}
        savedWords={savedWords}
        savedPhrases={savedPhrases}
        onSelectSentence={(text) => {
          setInputText(text);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSavedModal={() => setIsSavedModalOpen(true)}
        language={language}
      />
    </div>
  );
};

export default App;
