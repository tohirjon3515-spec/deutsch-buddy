import { AnalysisResult, VocabItem } from "../types";

export const USER_API_KEY_STORAGE = 'gemini_user_api_key';

/**
 * Retrieves user's personal Gemini API key from browser localStorage
 */
export const getUserApiKey = (): string | null => {
  try {
    const key = localStorage.getItem(USER_API_KEY_STORAGE);
    return key && key.trim() ? key.trim() : null;
  } catch {
    return null;
  }
};

/**
 * Stores user's personal Gemini API key in browser localStorage
 */
export const setUserApiKey = (key: string): void => {
  try {
    localStorage.setItem(USER_API_KEY_STORAGE, key.trim());
  } catch (e) {
    console.error("Failed to save API key to localStorage:", e);
  }
};

/**
 * Removes user's personal Gemini API key from browser localStorage
 */
export const removeUserApiKey = (): void => {
  try {
    localStorage.removeItem(USER_API_KEY_STORAGE);
  } catch (e) {
    console.error("Failed to remove API key from localStorage:", e);
  }
};

/**
 * Checks whether user has configured a personal Gemini API key
 */
export const hasUserApiKey = (): boolean => {
  return !!getUserApiKey();
};

/**
 * Generates headers for API requests, injecting 'x-user-api-key' if present
 */
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const userApiKey = getUserApiKey();
  if (userApiKey) {
    headers["x-user-api-key"] = userApiKey;
  }
  return headers;
};

// 1. Analyze German Text (Proxied to backend with optional personal API key header)
export const analyzeGermanText = async (
  text: string, 
  useSearch: boolean = false, 
  useDeepThinking: boolean = false,
  targetLang: 'uz' | 'en' | 'ru' = 'uz'
): Promise<AnalysisResult> => {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: getAuthHeaders(),
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

// 2. Generate Speech TTS (Proxied to backend with optional personal API key header)
export const generateSpeech = async (text: string): Promise<string> => {
  const response = await fetch("/api/speech", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Speech generation failed");
  }

  const data = await response.json();
  return data.audio || "";
};

// 3. Vocabulary Import Magic (Proxied to backend with optional personal API key header)
export const importVocabularyMagic = async (
  rawText: string,
  targetLang: 'uz' | 'en' | 'ru' = 'uz'
): Promise<VocabItem[]> => {
  const response = await fetch("/api/import-magic", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ rawText, targetLang }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Vocabulary import failed");
  }

  return response.json();
};

// 4. WebSocket Live speaking session proxy with optional user API key parameter
export const connectLiveSession = async (callbacks: {
  onopen: () => void;
  onmessage: (message: any) => Promise<void> | void;
  onerror: (e: any) => void;
  onclose: (e: any) => void;
}) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const userApiKey = getUserApiKey();
  const queryParam = userApiKey ? `?apiKey=${encodeURIComponent(userApiKey)}` : "";
  const wsUrl = `${protocol}//${window.location.host}/api/live${queryParam}`;
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

export const checkApiKeySelection = async (): Promise<boolean> => {
  return hasUserApiKey();
};

export const openApiKeySelection = async () => {
  console.log("Using API key management dialog.");
};
