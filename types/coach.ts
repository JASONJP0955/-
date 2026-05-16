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

export type CoachScores = {
  grammar: number;
  pronunciation: number;
  fluency: number;
};

export type CoachReply = {
  transcriptJa: string;
  grammarFeedback: GrammarFeedback[];
  pronunciationFeedback: PronunciationFeedback[];
  naturalExpressionJa: string;
  nextReplyJa: string;
  topicState: "continue" | "shift" | "wrap_up";
  nextTopicSuggestionZh: string;
  scores: CoachScores;
};

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
  sttProvider: "openai" | "google";
  sttModel: string;
};
