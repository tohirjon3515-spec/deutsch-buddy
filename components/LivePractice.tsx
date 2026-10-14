import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, VolumeX, MessageSquare, Loader2, Play, Square, User, Bot } from 'lucide-react';
import { connectLiveSession } from '../services/geminiService';
import { Language } from '../translations';

// Audio Helpers
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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

interface LivePracticeProps {
  language?: Language;
}

const LivePractice: React.FC<LivePracticeProps> = ({ language = 'uz' }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
  const currentTranscriptionRef = useRef({ user: '', bot: '' });
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextInRef.current) audioContextInRef.current.close();
    if (audioContextOutRef.current) audioContextOutRef.current.close();
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    setIsActive(false);
    setIsConnecting(false);
    nextStartTimeRef.current = 0;
  };

  const startSession = async () => {
    setIsConnecting(true);
    setChatHistory([]);
    try {
      audioContextInRef.current = new AudioContext({ sampleRate: 16000 });
      audioContextOutRef.current = new AudioContext({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = connectLiveSession({
        onopen: () => {
          setIsActive(true);
          setIsConnecting(false);
          const source = audioContextInRef.current!.createMediaStreamSource(stream);
          const processor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
            sessionPromise.then(s => s.sendRealtimeInput({
              media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
            }));
          };
          source.connect(processor);
          processor.connect(audioContextInRef.current!.destination);
        },
        onmessage: async (msg) => {
          // Handle Audio Output
          const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextOutRef.current!.currentTime);
            const buffer = await decodeAudioData(decode(audioData), audioContextOutRef.current!, 24000, 1);
            const source = audioContextOutRef.current!.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextOutRef.current!.destination);
            source.addEventListener('ended', () => {
              sourcesRef.current.delete(source);
            });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
          }

          // Handle Transcriptions
          if (msg.serverContent?.inputTranscription) {
            currentTranscriptionRef.current.user += msg.serverContent.inputTranscription.text;
          }
          if (msg.serverContent?.outputTranscription) {
            currentTranscriptionRef.current.bot += msg.serverContent.outputTranscription.text;
          }

          if (msg.serverContent?.turnComplete) {
            const userText = currentTranscriptionRef.current.user.trim();
            const botText = currentTranscriptionRef.current.bot.trim();
            
            if (userText || botText) {
                setChatHistory(prev => [
                    ...prev, 
                    ...(userText ? [{ role: 'user', text: userText } as const] : []),
                    ...(botText ? [{ role: 'bot', text: botText } as const] : [])
                ]);
            }
            currentTranscriptionRef.current = { user: '', bot: '' };
          }

          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => {
              try { s.stop(); } catch (e) {}
            });
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => {
          console.error('Live API Error:', e);
          stopSession();
        },
        onclose: () => stopSession()
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start Live practice:', err);
      setIsConnecting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full fixed bottom-24 right-4 z-50 animate-in slide-in-from-right-8 flex flex-col max-h-[60vh]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
          <h3 className="font-bold text-slate-800 dark:text-slate-100">
            {language === 'uz' ? 'Jonli so\'zlashuv mashqi' : 'Live Practice Mode'}
          </h3>
        </div>
        {isActive && (
          <button onClick={stopSession} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors">
            <Square className="w-5 h-5 fill-current" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {chatHistory.length === 0 && !isActive && (
           <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4 px-2">
             {language === 'uz' 
               ? "Nemis tilida gaplashishni mashq qiling. AI repetitor nemischa gapiradi, agar tushunmasangiz o'zbekcha yordam bera oladi!" 
               : "Start a conversation to practice your B1 German speaking skills."}
           </p>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
              <div className="flex items-center gap-1.5 mb-1 opacity-70 text-[10px] font-bold uppercase tracking-wider">
                {msg.role === 'user' ? <><User className="w-3 h-3" /> {language === 'uz' ? 'Siz' : 'You'}</> : <><Bot className="w-3 h-3" /> Tutor</>}
              </div>
              {msg.text}
            </div>
          </div>
        ))}
        {isActive && (
          <div className="flex justify-center py-2">
             <div className="flex gap-1 h-6 items-center">
                {[...Array(5)].map((_, i) => (
                   <div key={i} className="w-1 bg-indigo-500/50 rounded-full animate-bounce" style={{ height: '60%', animationDelay: `${i * 0.15}s` }} />
                ))}
             </div>
          </div>
        )}
      </div>

      <div className="shrink-0">
        {!isActive ? (
          <button
            onClick={startSession}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {language === 'uz' ? 'Ulanmoqda...' : 'Connecting...'}</>
            ) : (
              <><Play className="w-5 h-5" /> {language === 'uz' ? 'Suhbatni boshlash' : 'Join Live Practice'}</>
            )}
          </button>
        ) : (
          <div className="text-center space-y-2">
             <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
               {language === 'uz' ? 'Mikrofon faol, gapiring...' : 'Microphone is live...'}
             </p>
             <button onClick={stopSession} className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                {language === 'uz' ? 'Suhbatni yakunlash' : 'End Practice'}
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LivePractice;