export type Difficulty = "beginner" | "intermediate" | "advanced";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  audioUrl?: string;
  createdAt: string;
};

export type GrammarFeedback = {
  title: string;
  explanationZh: string;
  correctionJa: string;
};

export type PronunciationFeedback = {
  target: string;
  issueZh: string;
  practiceJa: string;
};

export type ErrorFeedback = {
  categoryZh: string;
  originalJa: string;
  issueZh: string;
  suggestionZh: string;
  correctionJa: string;
};

export type CoachScores = {
  grammar: number;
  pronunciation: number;
  fluency: number;
};

export type CoachFeedback = {
  transcriptJa: string;
  errorFeedback: ErrorFeedback[];
  grammarFeedback: GrammarFeedback[];
  pronunciationFeedback: PronunciationFeedback[];
  naturalExpressionJa: string;
  scores: CoachScores;
};

export type CoachQuickReply = {
  nextReplyJa: string;
  topicState: "continue" | "shift" | "wrap_up";
  nextTopicSuggestionZh: string;
};

export type CoachReply = CoachFeedback & CoachQuickReply;

export type SessionStart = {
  sessionId: string;
  topic: string;
  difficulty: Difficulty;
  assistantText: string;
  audioBase64?: string;
  demoMode: boolean;
};

export type ApiStatus = {
  demoMode: boolean;
  openaiConfigured: boolean;
  googleConfigured: boolean;
  speechConfigured: boolean;
  supabaseConfigured: boolean;
  authenticated: boolean;
  userEmail: string | null;
  sttProvider: "openai" | "google";
  sttModel: string;
};
