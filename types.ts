
export interface VocabItem {
  word: string;
  type: string;
  grammarForms: string;
  meaning: string;
  contextSentence?: string;
  difficulty?: 'easy' | 'hard';
  cefrLevel?: 'B1' | 'B2' | 'C1';
  isNVV?: boolean;
}

export interface PhraseItem {
  phrase: string;
  literalTranslation: string;
  actualMeaning: string;
  explanation: string;
  exampleSentence: string;
  difficulty: 'Common' | 'Intermediate' | 'Advanced';
  category?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface SentenceChallenge {
  target: string;
  shuffled: string[];
  translation: string;
}

export interface GrammarSpotlight {
  topic: string;
  explanation: string;
  examples: string[];
}

export interface LinguisticInsights {
  themes: string[];
  connectors: { word: string; function: string }[];
  stylisticNote: string;
}

export interface B2Highlights {
  detectedStructures?: string[];
  goetheExamTip?: string;
}

export interface AnalysisResult {
  mode: 'sentence' | 'paragraph';
  translation: string;
  vocabulary: VocabItem[];
  phrases: PhraseItem[];
  grammarSpotlight?: GrammarSpotlight;
  sentenceChallenge?: SentenceChallenge;
  linguisticInsights?: LinguisticInsights;
  b2Highlights?: B2Highlights;
  sources?: GroundingSource[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface HistoryRecord {
  id: string;
  userId: string;
  text: string;
  mode: 'sentence' | 'paragraph';
  translation: string;
  createdAt: string;
  grammarTopic?: string;
  detectedStructures?: string[];
  vocabCount?: number;
}

export interface GrammarTopicDefinition {
  id: string;
  titleDe: string;
  titleUz: string;
  titleEn: string;
  level: 'B1' | 'B2' | 'B2+';
  descriptionUz: string;
  descriptionEn: string;
  sampleSentence: string;
  keywords: string[];
}

