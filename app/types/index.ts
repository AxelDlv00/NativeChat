export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  explanation?: string | null;
  correction?: string | null;
  examples?: string | null;
  // États UI (non stockés en DB)
  isCorrecting?: boolean;
  isExplaining?: boolean;
  isGeneratingExamples?: boolean;
  pinyin?: string | null;     
  translation?: string | null;
}

export interface Chat {
  id: string;
  title: string;
  topic?: string | null;
  sourceLang: string;
  targetLang: string;
  messages: Message[];
  createdAt: string | Date;
}