import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Type, Schema, Modality, LiveServerMessage } from "@google/genai";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Parse JSON bodies up to 10MB
app.use(express.json({ limit: "10mb" }));

// Lazy getter for Google GenAI to prevent crash during server startup if key is missing
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set on the server.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// JSON Schema for the structured German analysis output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    mode: { type: Type.STRING, enum: ["sentence", "paragraph"] },
    translation: { type: Type.STRING },
    vocabulary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          type: { type: Type.STRING },
          grammarForms: { type: Type.STRING },
          meaning: { type: Type.STRING },
          contextSentence: { type: Type.STRING },
          cefrLevel: { type: Type.STRING },
          isNVV: { type: Type.BOOLEAN },
        },
        required: ["word", "type", "grammarForms", "meaning", "contextSentence"],
      },
    },
    phrases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phrase: { type: Type.STRING },
          literalTranslation: { type: Type.STRING },
          actualMeaning: { type: Type.STRING },
          explanation: { type: Type.STRING },
          exampleSentence: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ["Common", "Intermediate", "Advanced"] },
          category: { type: Type.STRING },
        },
        required: ["phrase", "literalTranslation", "actualMeaning", "explanation", "exampleSentence", "difficulty"],
      },
    },
    grammarSpotlight: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        explanation: { type: Type.STRING },
        examples: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["topic", "explanation", "examples"],
    },
    b2Highlights: {
      type: Type.OBJECT,
      properties: {
        detectedStructures: { type: Type.ARRAY, items: { type: Type.STRING } },
        goetheExamTip: { type: Type.STRING },
      },
      required: ["detectedStructures", "goetheExamTip"],
    },
    sentenceChallenge: {
      type: Type.OBJECT,
      properties: {
        target: { type: Type.STRING },
        shuffled: { type: Type.ARRAY, items: { type: Type.STRING } },
        translation: { type: Type.STRING },
      },
      required: ["target", "shuffled", "translation"],
    },
    linguisticInsights: {
      type: Type.OBJECT,
      properties: {
        themes: { type: Type.ARRAY, items: { type: Type.STRING } },
        connectors: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              function: { type: Type.STRING },
            },
            required: ["word", "function"],
          },
        },
        stylisticNote: { type: Type.STRING },
      },
      required: ["themes", "connectors", "stylisticNote"],
    },
  },
  required: ["mode", "translation", "vocabulary", "phrases"],
};

// In-memory cache for analysis results (prevents quota exhaustion on repeated queries or language switches)
interface CacheEntry {
  data: any;
  timestamp: number;
}
const analysisCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

// Helper to handle transient Gemini API errors (503, 429, high demand) with retries and fallback models
async function generateContentWithRetry(options: {
  model: string;
  fallbackModels?: string[];
  contents: any;
  config?: any;
}) {
  const ai = getAI();
  const modelsToTry = Array.from(new Set([options.model, ...(options.fallbackModels || [])]));
  let lastError: any = null;

  for (const model of modelsToTry) {
    let config = { ...options.config };
    // Thinking config is only supported on gemini-3.1-pro-preview
    if (model !== "gemini-3.1-pro-preview" && config.thinkingConfig) {
      delete config.thinkingConfig;
    }

    // Try up to 2 attempts per model (but immediately switch on per-minute quota exhaustion)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err || "");
        const status = err?.status || err?.code || err?.error?.code;

        const isQuotaExhausted =
          status === 429 ||
          errStr.includes("RESOURCE_EXHAUSTED") ||
          errStr.includes("quota exceeded") ||
          errStr.includes("Quota exceeded");

        // If search grounding was enabled and caused quota or tool error, strip tools and retry this model once
        if (config.tools && isQuotaExhausted) {
          console.warn(`[Gemini API] Search tools quota hit on ${model}, retrying without search grounding...`);
          config = { ...config };
          delete config.tools;
          continue;
        }

        // On quota exhaustion (RESOURCE_EXHAUSTED), 500ms delay won't reset the per-minute quota window.
        // Immediately switch to the next fallback model (e.g. gemini-3.1-flash-lite)
        if (isQuotaExhausted) {
          console.warn(`[Gemini API] Quota limit reached on ${model}. Switching to fallback model immediately...`);
          break;
        }

        const isHighDemandOrTransient =
          status === 503 ||
          status === 500 ||
          errStr.includes("503") ||
          errStr.includes("UNAVAILABLE") ||
          errStr.includes("high demand") ||
          errStr.includes("overloaded");

        if (isHighDemandOrTransient && attempt < 1) {
          console.warn(`[Gemini API] Temporary high demand on ${model} (attempt 1/2). Retrying in 600ms...`);
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }

        console.warn(`[Gemini API] Switching from ${model} due to error: ${errStr.slice(0, 150)}`);
        break;
      }
    }
  }

  let cleanMsg = lastError?.message || "AI service is currently busy. Please try again in a few seconds.";
  if (
    cleanMsg.includes("503") ||
    cleanMsg.includes("high demand") ||
    cleanMsg.includes("UNAVAILABLE") ||
    cleanMsg.includes("RESOURCE_EXHAUSTED") ||
    cleanMsg.includes("quota exceeded") ||
    cleanMsg.includes("429")
  ) {
    cleanMsg = "The AI service is experiencing temporary high demand or rate limits. Please try again in a moment.";
  }
  throw new Error(cleanMsg);
}

// --- API Endpoints ---

// 1. Analyze German Text
app.post("/api/analyze", async (req: express.Request, res: express.Response) => {
  try {
    const { text, useSearch, useThinking, targetLang } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      return res.status(400).json({ error: "Text cannot be empty" });
    }

    const lang = targetLang === "ru" ? "ru" : targetLang === "en" ? "en" : "uz";
    const cacheKey = `${trimmedText.toLowerCase()}_${lang}_${Boolean(useSearch)}_${Boolean(useThinking)}`;
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const primaryModel = useThinking ? "gemini-3.1-pro-preview" : "gemini-3.8-flash";
    const fallbackModels = useThinking
      ? ["gemini-3.8-flash", "gemini-3.1-flash-lite"]
      : ["gemini-3.1-flash-lite"];

    const config: any = {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
      temperature: 0.2,
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    if (useThinking && primaryModel === "gemini-3.1-pro-preview") {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const prompt = lang === "ru"
      ? `
      As an expert German Language CEFR B2 Tutor for Russian-speaking students (preparing for Goethe-Zertifikat B2 and telc Deutsch B2), perform an exhaustive linguistic and exam-oriented analysis of this German input: "${trimmedText}"
      
      CRITICAL INSTRUCTIONS FOR B2 LOCALIZATION IN RUSSIAN:
      1. All translations, vocabulary meanings, phrase explanations, literal translations, and grammar breakdowns MUST BE IN CLEAR, NATURAL RUSSIAN (Русский язык).
      2. TARGET CEFR B2 LEVEL:
         - Identify ALL significant nouns, verbs, and adjectives.
         - For nouns, always include the definite article (der/die/das) and plural form.
         - For verbs, indicate fixed prepositions if any (например: "abhängen von + Dat", "achten auf + Akk", "sich freuen auf/über").
         - 'cefrLevel': estimate level ('B1', 'B2', or 'C1').
         - 'isNVV': set true if it forms a Nomen-Verb-Verbindung (Funktionsverbgefüge).
         - 'meaning': Accurate Russian definition.
         - 'grammarForms': German principal forms (e.g. "hat in Betracht gezogen, NVV", "untersuchte, hat untersucht").
      3. Extract ALL relevant collocations, idioms, B2 Redemittel, and Nomen-Verb-Verbindungen:
         - 'phrase': The German collocation.
         - 'category': Categorize as "Nomen-Verb-Verbindung", "Passiv-Alternative", "Zweiteiliger Konnektor", "B2 Redemittel", or "Feste Präposition".
         - 'literalTranslation': Дословный русский перевод.
         - 'actualMeaning': Фактическое / переносное значение на русском языке.
         - 'explanation': Объяснение на русском языке использования и значения данного выражения.
         - 'exampleSentence': German B2 example sentence.
         - 'difficulty': "Intermediate" or "Advanced".
      4. If the input is a paragraph, provide 'linguisticInsights':
         - themes: Core subjects described in Russian.
         - connectors: Logical German linking words and their function explained in Russian.
         - stylisticNote: Stylistic observation written in Russian.
      5. b2Highlights:
         - detectedStructures: Array of key B2 structures found.
         - goetheExamTip: High-yield advice in RUSSIAN for Goethe-Zertifikat B2 / telc B2 exams explaining how students can apply these structures to score higher.
      6. translation: Natural, idiomatic, clear RUSSIAN translation of the input text.
      7. grammarSpotlight: Focus on the key B2 German grammar pattern present.
         - topic: Title in Russian/German.
         - explanation: Detailed, clear explanation written in RUSSIAN with B2 exam relevance.
         - examples: Illustrative German examples.
      8. sentenceChallenge:
         - target: German B2 sentence from the text.
         - shuffled: Shuffled words of the German sentence.
         - translation: RUSSIAN translation of this sentence.
      
      Ensure the output is high-quality, pedagogically clear in Russian, and directly helps Russian-speaking students pass the B2 German exam.
    `
      : lang === "uz"
      ? `
      As an expert German Language CEFR B2 Tutor for Uzbek students (preparing for Goethe-Zertifikat B2 and telc Deutsch B2), perform an exhaustive linguistic and exam-oriented analysis of this German input: "${trimmedText}"
      
      CRITICAL INSTRUCTIONS FOR B2 LOCALIZATION IN UZBEK:
      1. All translations, vocabulary meanings, phrase explanations, literal translations, and grammar breakdowns MUST BE IN NATURAL, ACCURATE UZBEK (O'zbek tili, Lotin yozuvida).
      2. TARGET CEFR B2 LEVEL:
         - Identify ALL significant nouns, verbs, and adjectives.
         - For nouns, always include the definite article (der/die/das) and plural form.
         - For verbs, indicate fixed prepositions if any (masalan: "abhängen von + Dat", "achten auf + Akk", "sich freuen auf/über").
         - 'cefrLevel': estimate level ('B1', 'B2', or 'C1').
         - 'isNVV': set true if it forms a Nomen-Verb-Verbindung (Funktionsverbgefüge).
         - 'meaning': Accurate Uzbek definition.
         - 'grammarForms': German principal forms (e.g. "hat in Betracht gezogen, NVV", "untersuchte, hat untersucht").
      3. Extract ALL relevant collocations, idioms, B2 Redemittel, and Nomen-Verb-Verbindungen:
         - 'phrase': The German collocation.
         - 'category': Categorize as "Nomen-Verb-Verbindung", "Passiv-Alternative", "Zweiteiliger Konnektor", "B2 Redemittel", or "Feste Präposition".
         - 'literalTranslation': So'zma-so'z o'zbekcha tarjimasi.
         - 'actualMeaning': Haqiqiy / ko'chma o'zbekcha ma'nosi.
         - 'explanation': O'zbek tilida ushbu iboraning ishlatilishi va ma'nosining tushuntirilishi.
         - 'exampleSentence': German B2 example sentence.
         - 'difficulty': "Intermediate" or "Advanced".
      4. If the input is a paragraph, provide 'linguisticInsights':
         - themes: Core subjects described in Uzbek.
         - connectors: Logical German linking words (word, e.g. obwohl, insofern als, folglich, einerseits... andererseits) and their function explained in Uzbek.
         - stylisticNote: Stylistic observation written in Uzbek (e.g., Gehobener Stil, Fachsprache, Argumentativ).
      5. b2Highlights:
         - detectedStructures: Array of key B2 structures found (e.g., ["Nomen-Verb-Verbindung: 'in Betracht ziehen'", "Zweiteiliger Konnektor: 'sowohl ... als auch'", "Passiv-Ersatzform: 'lässt sich nicht überprüfen'"]).
         - goetheExamTip: High-yield advice in UZBEK for Goethe-Zertifikat B2 / telc B2 exams (Schreiben or Sprechen modules) explaining how students can use these structures to score higher.
      6. translation: Natural, idiomatic, clear UZBEK translation of the input text.
      7. grammarSpotlight: Focus on the key B2 German grammar pattern present (e.g. Nomen-Verb-Verbindungen, Passiv-Alternativen mit 'sein zu' / 'lassen sich', Konjunktiv II in der Vergangenheit, Zweiteilige Konnektoren, Nominalstil).
         - topic: Title in Uzbek/German.
         - explanation: Detailed, clear explanation written in UZBEK with B2 exam relevance.
         - examples: Illustrative German examples.
      8. sentenceChallenge:
         - target: German B2 sentence from the text.
         - shuffled: Shuffled words of the German sentence.
         - translation: UZBEK translation of this sentence.
      
      Ensure the output is high-quality, pedagogically clear in Uzbek, and directly helps Uzbek students pass the B2 German exam.
    `
      : `
      As an expert German Language CEFR B2 Tutor (Goethe-Zertifikat B2 & telc Deutsch B2 specialist), perform an exhaustive linguistic analysis of this German input: "${trimmedText}"
      
      CRITICAL INSTRUCTIONS FOR B2 LEVEL:
      1. Vocabulary extraction: Identify all significant nouns, verbs, and adjectives.
         - Always include definite articles (der/die/das) for nouns.
         - Include fixed prepositions for verbs (e.g. "bestehen aus/auf/in", "beitragen zu + Dat").
         - Identify 'cefrLevel' ('B1', 'B2', or 'C1') and 'isNVV' (boolean for Noun-Verb collocations).
      2. Extract B2 collocations, idioms, Redemittel, and Nomen-Verb-Verbindungen with categories ("Nomen-Verb-Verbindung", "Passiv-Alternative", "Zweiteiliger Konnektor", "B2 Redemittel", "Feste Präposition").
      3. b2Highlights:
         - detectedStructures: Array of B2 exam patterns found (e.g., ["Noun-Verb Collocation: 'in Betracht ziehen'", "Two-part connector: 'nicht nur ... sondern auch'"]).
         - goetheExamTip: Strategic exam advice for Goethe B2 / telc B2 test takers on how to apply these structures in Writing and Speaking tasks.
      4. If the input is a paragraph, provide 'linguisticInsights' (themes, connectors, stylisticNote).
      5. translation: Natural, idiomatic English translation.
      6. grammarSpotlight: Focus on the most important B2 grammar rule (Passive replacements, two-part connectors, subjunctive II, nominal style).
      7. sentenceChallenge: A rebuild-the-sentence exercise based on a key sentence from the input.
      
      Ensure the output is high-quality, professional, and directly helps a B2-level student achieve exam mastery.
    `;

    const response = await generateContentWithRetry({
      model: primaryModel,
      fallbackModels,
      contents: prompt,
      config,
    });

    const result = JSON.parse(response.text || "{}");

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      const sources = chunks
        .filter((c: any) => c.web)
        .map((c: any) => ({
          title: c.web.title || "Source",
          uri: c.web.uri,
        }));
      result.sources = sources;
    }

    if (analysisCache.size > 200) {
      const oldestKey = analysisCache.keys().next().value;
      if (oldestKey) analysisCache.delete(oldestKey);
    }
    analysisCache.set(cacheKey, { data: result, timestamp: Date.now() });

    res.json(result);
  } catch (error: any) {
    console.error("Analysis failed:", error);
    res.status(500).json({ error: error.message || "Linguistic analysis failed" });
  }
});

// In-memory cache for generated TTS audio
const audioCache = new Map<string, string>();

// 2. Generate Speech TTS
app.post("/api/speech", async (req: express.Request, res: express.Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const trimmed = text.trim();
    if (audioCache.has(trimmed)) {
      return res.json({ audio: audioCache.get(trimmed) });
    }

    const response = await generateContentWithRetry({
      model: "gemini-3.8-flash-lite-tts",
      fallbackModels: ["gemini-3.8-flash-tts"],
      contents: [{ parts: [{ text: `Say cheerfully in clear German: ${trimmed}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
    if (base64Audio) {
      if (audioCache.size > 150) {
        const first = audioCache.keys().next().value;
        if (first) audioCache.delete(first);
      }
      audioCache.set(trimmed, base64Audio);
    }
    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("Speech generation failed:", error);
    res.status(500).json({ error: error.message || "Speech generation failed" });
  }
});

// 3. Vocabulary Import Magic
app.post("/api/import-magic", async (req: express.Request, res: express.Response) => {
  try {
    const { rawText, targetLang } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: "Raw text is required" });
    }

    const importLang = targetLang === "ru" ? "ru" : targetLang === "en" ? "en" : "uz";
    const contents = importLang === "ru"
      ? `Transform this list into valid German B1 Vocabulary objects: "${rawText}". 
      For each word, find: word, type (Noun/Verb/Adj), grammarForms (e.g., der Tisch, -e), meaning (in natural Russian, e.g., "стол", "писать", "красивый"), and a short German context sentence.`
      : importLang === "uz"
      ? `Transform this list into valid German B1 Vocabulary objects: "${rawText}". 
      For each word, find: word, type (Noun/Verb/Adj), grammarForms (e.g., der Tisch, -e), meaning (in natural Uzbek, e.g., "stol", "yozmoq", "chiroyli"), and a short German context sentence.`
      : `Transform this list into valid German B1 Vocabulary objects: "${rawText}". 
      For each word, find: word, type (Noun/Verb/Adj), grammarForms (e.g., der Tisch, -e), meaning (English), and a short context sentence.`;

    const response = await generateContentWithRetry({
      model: "gemini-3.8-flash",
      fallbackModels: ["gemini-3.1-flash-lite"],
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              type: { type: Type.STRING },
              grammarForms: { type: Type.STRING },
              meaning: { type: Type.STRING },
              contextSentence: { type: Type.STRING },
            },
            required: ["word", "type", "grammarForms", "meaning", "contextSentence"],
          },
        },
      },
    });

    const items = JSON.parse(response.text || "[]");
    res.json(items);
  } catch (error: any) {
    console.error("Import magic failed:", error);
    res.status(500).json({ error: error.message || "Failed to import vocabulary" });
  }
});

// --- WebSocket Setup for Live Real-Time speaking practice ---

wss.on("connection", async (clientWs) => {
  console.log("Client connected to server live WebSocket");
  let session: any = null;

  try {
    const ai = getAI();
    session = await ai.live.connect({
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: "You are an encouraging German Language CEFR B2 Tutor for Uzbek students preparing for Goethe-Zertifikat B2 and telc Deutsch B2 exams. Speak natural German appropriate for B2 learners using B2 vocabulary, Nomen-Verb-Verbindungen, and Redemittel for oral exam tasks (Vortrag halten, Meinungsäußerung, Diskussion). If the student speaks Uzbek or asks for help in Uzbek, understand them and give clear, supportive explanations in Uzbek while encouraging active German speaking. Keep responses concise, warm, and conversational.",
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          if (clientWs.readyState === clientWs.OPEN) {
            clientWs.send(JSON.stringify(message));
          }
        },
        onerror: (err) => {
          console.error("Gemini Live Session Error:", err);
        },
        onclose: () => {
          console.log("Gemini Live Session closed");
          if (clientWs.readyState === clientWs.OPEN) {
            clientWs.close();
          }
        },
      },
    });

    clientWs.on("message", (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      } catch (err) {
        console.error("Error sending input to Live Session:", err);
      }
    });

    clientWs.on("close", () => {
      console.log("Client closed server live WebSocket");
      if (session) {
        try {
          session.close();
        } catch (e) {}
      }
    });
  } catch (err) {
    console.error("Failed to establish Live session:", err);
    clientWs.close();
  }
});

// Handle WebSocket upgrades
server.on("upgrade", (request, socket, head) => {
  const pathname = request.url ? request.url.split('?')[0] : '';
  if (pathname === "/api/live" || pathname === "/live") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});

// --- Server & Frontend Hosting ---

// Start server listening
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Integrate Vite dev middleware or serve built app
const isProd = process.env.NODE_ENV === "production";
if (!isProd) {
  import("vite").then(async ({ createServer: createViteServer }) => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*all", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
