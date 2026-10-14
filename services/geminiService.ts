import { AnalysisResult, VocabItem } from "../types";

// 1. Analyze German Text (Proxied to backend)
export const analyzeGermanText = async (
  text: string, 
  useSearch: boolean = false, 
  useDeepThinking: boolean = false,
  targetLang: 'uz' | 'en' = 'uz'
): Promise<AnalysisResult> => {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      useSearch,
      useThinking: useDeepThinking,
      targetLang,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Analysis failed");
  }

  return response.json();
};

// 2. Generate Speech TTS (Proxied to backend)
export const generateSpeech = async (text: string): Promise<string> => {
  const response = await fetch("/api/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Speech generation failed");
  }

  const data = await response.json();
  return data.audio || "";
};

// 3. Vocabulary Import Magic (Proxied to backend)
export const importVocabularyMagic = async (
  rawText: string,
  targetLang: 'uz' | 'en' = 'uz'
): Promise<VocabItem[]> => {
  const response = await fetch("/api/import-magic", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rawText, targetLang }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Vocabulary import failed");
  }

  return response.json();
};

// 4. WebSocket Live speaking session proxy
export const connectLiveSession = async (callbacks: {
  onopen: () => void;
  onmessage: (message: any) => Promise<void> | void;
  onerror: (e: any) => void;
  onclose: (e: any) => void;
}) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/api/live`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = callbacks.onopen;
  ws.onerror = callbacks.onerror;
  ws.onclose = callbacks.onclose;

  ws.onmessage = async (event) => {
    try {
      const parsed = JSON.parse(event.data);
      callbacks.onmessage(parsed);
    } catch (err) {
      console.error("Error parsing Live WS message:", err);
    }
  };

  return {
    sendRealtimeInput: (input: { media?: { data: string; mimeType: string }; audio?: { data: string; mimeType: string } }) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Map client's legacy media inputs to standard audio on the server
        const audioData = input.audio?.data || input.media?.data;
        if (audioData) {
          ws.send(JSON.stringify({ audio: audioData }));
        }
      }
    },
    close: () => {
      ws.close();
    },
  };
};

// Keep placeholder functions for compatibility with any existing UI state checks
export const checkApiKeySelection = async (): Promise<boolean> => {
  return true;
};

export const openApiKeySelection = async () => {
  console.log("Using server-managed backend API key config.");
};
