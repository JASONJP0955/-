import type { CoachFeedback, CoachQuickReply, CoachReply, Difficulty } from "@/types/coach";
import { createResponseJson } from "@/lib/openai";

type StarterTopic = {
  topic: string;
  starter: string;
};

const interviewStarter =
  "本日はお忙しい中、面接にお越しいただきありがとうございます。どうぞリラックスしてお話しください。こちらからいくつか質問しますので、できるだけ具体的にお答えください。それでは、まず自己紹介をお願いします。";

const interviewQuestions: StarterTopic[] = [
  {
    topic: "self PR",
    starter: "自己PRをお願いします。ご自身の強みが伝わるように、具体的な経験も交えてお話しください。"
  },
  {
    topic: "student effort",
    starter: "学生生活で最も力を入れたことは何ですか。取り組んだ理由と、そこから学んだことも教えてください。"
  },
  {
    topic: "company motivation",
    starter: "なぜ弊社を志望されたのですか。弊社のどの点に魅力を感じたのか、具体的に教えてください。"
  },
  {
    topic: "other applications",
    starter: "ほかにはどのような会社を受けていますか。会社選びで重視している点もあわせて教えてください。"
  },
  {
    topic: "after joining",
    starter: "入社後にやりたいことは何ですか。どのような仕事に挑戦したいか、理由も含めて教えてください。"
  },
  {
    topic: "weakness",
    starter: "あなたの弱みや短所は何ですか。その弱みを改善するために、どのような工夫をしていますか。"
  },
  {
    topic: "strength",
    starter: "あなたの強みは何ですか。その強みを発揮した具体的な経験を教えてください。"
  },
  {
    topic: "failure",
    starter: "挫折や失敗の経験を教えてください。その経験から何を学び、どのように次に生かしましたか。"
  },
  {
    topic: "favorite subject",
    starter: "学生時代に力を入れた科目は何ですか。その科目に力を入れた理由と、学んだ内容を教えてください。"
  },
  {
    topic: "job hunting axis",
    starter: "あなたの就職活動の軸は何ですか。企業や仕事を選ぶうえで、特に大切にしていることを教えてください。"
  },
  {
    topic: "recent news",
    starter: "最近気になるニュースはありますか。そのニュースに関心を持った理由と、あなたの考えを教えてください。"
  },
  {
    topic: "school memory",
    starter: "中学や高校のときの思い出はありますか。特に印象に残っている出来事を教えてください。"
  },
  {
    topic: "recent impression",
    starter: "最近感動したことは何ですか。なぜ感動したのか、具体的に教えてください。"
  },
  {
    topic: "part time job",
    starter: "アルバイト経験はありますか。エントリーシートに書いていない経験があれば、その内容も教えてください。"
  },
  {
    topic: "hobby",
    starter: "趣味は何ですか。その趣味を通じて得たことや、続けている理由も教えてください。"
  },
  {
    topic: "future vision",
    starter: "5年後、10年後にはどのようになっていたいですか。仕事面での目標も含めて教えてください。"
  },
  {
    topic: "offer acceptance",
    starter: "もし弊社から内定を出した場合、入社していただけますか。その理由もあわせて教えてください。"
  },
  {
    topic: "stress relief",
    starter: "ストレスの解消法はどのようなことですか。普段どのように気持ちを切り替えているか教えてください。"
  },
  {
    topic: "personality",
    starter: "ご自身の性格について、どのように考えていますか。長所と注意している点を教えてください。"
  },
  {
    topic: "qualification",
    starter: "〇〇の資格をお持ちですね。その資格を取得しようと思った理由と、学んだことを教えてください。"
  },
  {
    topic: "industry motivation",
    starter: "なぜこの業界を志望されたのですか。業界に興味を持ったきっかけも教えてください。"
  },
  {
    topic: "questions for interviewer",
    starter: "最後に、何か質問はありますか。弊社や仕事内容について、確認したいことがあれば教えてください。"
  },
  {
    topic: "metaphor",
    starter: "あなたを何かにたとえると何ですか。その理由もあわせて教えてください。"
  },
  {
    topic: "online research",
    starter: "インターネットで調べた弊社の情報の中で、特に印象に残っていることは何ですか。"
  },
  {
    topic: "why Japanese",
    starter: "なぜ日本語を勉強しようと思ったのですか。学習を続けている理由も教えてください。"
  },
  {
    topic: "why IT",
    starter: "なぜIT業界に入りたいと思ったのですか。IT業界で実現したいことも教えてください。"
  },
  {
    topic: "why Japan",
    starter: "なぜ日本に来ようと思ったのですか。日本で働きたい理由も含めて教えてください。"
  },
  {
    topic: "others evaluation",
    starter: "周囲の人から、あなたはどのような人だと言われますか。そのように言われる理由も教えてください。"
  },
  {
    topic: "dream",
    starter: "将来の目標や夢は何ですか。その目標に向けて、今取り組んでいることも教えてください。"
  },
  {
    topic: "motivation",
    starter: "志望動機を教えてください。なぜこの仕事に興味を持ったのか、具体的にお話しください。"
  },
  {
    topic: "gap after graduation",
    starter: "大学を卒業してから正式に働くまで一年半ほど空白期間があるようですが、その間はどのように過ごし、どのような仕事をしていましたか。"
  },
  {
    topic: "library system challenge",
    starter: "図書管理システムを開発する上で、難しかったことは何ですか。どのように解決したかも教えてください。"
  }
];

function pickInterviewQuestion() {
  return interviewQuestions[Math.floor(Math.random() * interviewQuestions.length)];
}

export function createSessionStarter() {
  return {
    topic: "日本就職面接",
    starter: interviewStarter
  };
}

export function demoReply(transcriptJa = "本日はよろしくお願いいたします。私は日本語とITを勉強しています。"): CoachReply {
  return {
    transcriptJa,
    errorFeedback: [
      {
        categoryZh: "面试回答完整度",
        originalJa: transcriptJa,
        issueZh: "这句话可以理解，但作为面试回答信息量偏少。",
        suggestionZh: "建议补充具体经历、成果或志望理由，让回答更像正式面试。",
        correctionJa: "本日はよろしくお願いいたします。私は日本語とITを学んでおり、将来はシステム開発の仕事に挑戦したいと考えています。"
      }
    ],
    grammarFeedback: [
      {
        title: "面接らしい丁寧さ",
        explanationZh: "面试中建议使用更完整、更礼貌的です・ます体，并加入具体内容。",
        correctionJa: "本日はよろしくお願いいたします。私は日本語とITを学んでいます。"
      }
    ],
    pronunciationFeedback: [
      {
        target: "よろしくお願いいたします",
        issueZh: "这句话在面试开头很常用，建议慢一点、清楚地说完整。",
        practiceJa: "よ・ろ・し・く お・ね・が・い い・た・し・ま・す"
      }
    ],
    naturalExpressionJa:
      "本日はよろしくお願いいたします。私は日本語とITを学んでおり、将来はシステム開発の仕事に挑戦したいと考えています。",
    nextReplyJa: "ありがとうございます。それでは次に、自己PRをお願いします。ご自身の強みが伝わるように、具体的な経験も交えてお話しください。",
    topicState: "shift",
    nextTopicSuggestionZh: "进入正式面试问题",
    scores: {
      grammar: 88,
      pronunciation: 80,
      fluency: 82
    }
  };
}

export async function continueConversation(params: {
  transcriptJa: string;
  topic: string;
  difficulty: Difficulty;
  turnCount: number;
  history: { role: "assistant" | "user"; text: string }[];
}) {
  const askNewInterviewQuestion = params.turnCount === 1 || (params.turnCount > 1 && (params.turnCount - 1) % 3 === 0);
  const followUpNumber = askNewInterviewQuestion ? 0 : ((Math.max(params.turnCount, 2) - 2) % 3) + 1;
  const selectedQuestion = askNewInterviewQuestion ? pickInterviewQuestion() : null;
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["nextReplyJa", "topicState", "nextTopicSuggestionZh"],
    properties: {
      nextReplyJa: { type: "string", minLength: 40 },
      topicState: { type: "string", enum: ["continue", "shift", "wrap_up"] },
      nextTopicSuggestionZh: { type: "string" }
    }
  };

  return createResponseJson<CoachQuickReply>({
    model: process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-5-mini",
    reasoning: { effort: "minimal" },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "japanese_voice_coach_fast_reply",
        schema,
        strict: true
      }
    },
    input: [
      {
        role: "developer",
        content:
          "You are a polite Japanese hiring interviewer helping a Chinese native speaker practice job interviews in Japanese. Reply only in Japanese. Do not give correction advice here. Keep a professional interview tone. If askNewInterviewQuestion is true, briefly thank or acknowledge the candidate's latest answer, then ask selectedInterviewQuestionJa as the next main interview question; do not add a second question. If askNewInterviewQuestion is false, ask one deeper follow-up question connected to the candidate's latest answer and the current interview question. This follow-up is number followUpNumber of 2; after two follow-ups, the next turn will move to a different interview question. Use 2 to 4 sentences, roughly 80 to 180 Japanese characters."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Continue the Japanese job interview quickly.",
          topic: "日本就職面接",
          requestedTopicFromClient: params.topic,
          difficulty: params.difficulty,
          turnCount: params.turnCount,
          askNewInterviewQuestion,
          selectedInterviewQuestionTopic: selectedQuestion?.topic ?? "",
          selectedInterviewQuestionJa: selectedQuestion?.starter ?? "",
          followUpNumber,
          interviewFlowRule:
            "The first assistant message asked for self-introduction. After the self-introduction answer, ask a random bank question. For each bank question, ask two follow-up questions, then move to another random bank question.",
          history: params.history.slice(-8),
          transcriptJa: params.transcriptJa
        })
      }
    ]
  });
}

export async function evaluateFeedback(params: {
  transcriptJa: string;
  topic: string;
  difficulty: Difficulty;
  contextQuestionJa?: string;
}) {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: [
      "transcriptJa",
      "errorFeedback",
      "grammarFeedback",
      "pronunciationFeedback",
      "naturalExpressionJa",
      "scores"
    ],
    properties: {
      transcriptJa: { type: "string" },
      errorFeedback: {
        type: "array",
        minItems: 0,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["categoryZh", "originalJa", "issueZh", "suggestionZh", "correctionJa"],
          properties: {
            categoryZh: { type: "string" },
            originalJa: { type: "string" },
            issueZh: { type: "string" },
            suggestionZh: { type: "string" },
            correctionJa: { type: "string" }
          }
        }
      },
      grammarFeedback: {
        type: "array",
        minItems: 0,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "explanationZh", "correctionJa"],
          properties: {
            title: { type: "string" },
            explanationZh: { type: "string" },
            correctionJa: { type: "string" }
          }
        }
      },
      pronunciationFeedback: {
        type: "array",
        minItems: 0,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["target", "issueZh", "practiceJa"],
          properties: {
            target: { type: "string" },
            issueZh: { type: "string" },
            practiceJa: { type: "string" }
          }
        }
      },
      naturalExpressionJa: { type: "string" },
      scores: {
        type: "object",
        additionalProperties: false,
        required: ["grammar", "pronunciation", "fluency"],
        properties: {
          grammar: { type: "number", minimum: 0, maximum: 100 },
          pronunciation: { type: "number", minimum: 0, maximum: 100 },
          fluency: { type: "number", minimum: 0, maximum: 100 }
        }
      }
    }
  };

  return createResponseJson<CoachFeedback>({
    model: process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-5-mini",
    reasoning: { effort: "low" },
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: "japanese_voice_coach_feedback",
        schema,
        strict: true
      }
    },
    input: [
      {
        role: "developer",
        content:
          "You are a Japanese interview speaking coach for Chinese native speakers. Feedback must be concise Chinese text. Do not continue the conversation here. Analyze only targetTranscriptJa. Do not analyze contextQuestionJa or any previous conversation text. Evaluate the answer as Japanese job interview speech, so prefer polite desu/masu style, concrete examples, and professional word choice. In errorFeedback, list concrete problems in targetTranscriptJa only, including vocabulary, grammar, particles, tense, word choice, missing politeness, and unnatural expressions. For each item, cite an original Japanese fragment that appears in targetTranscriptJa, explain the issue in Chinese, give an actionable Chinese suggestion, and provide one corrected Japanese version. If there is no clear error, include only one improvement item about richness or interview appropriateness. Pronunciation feedback is based on transcript-level evidence, so phrase it as likely or practice-focused unless the issue is certain."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Evaluate only targetTranscriptJa. Return only text feedback and scores for targetTranscriptJa.",
          topic: "日本就職面接",
          requestedTopicFromClient: params.topic,
          difficulty: params.difficulty,
          contextQuestionJa: params.contextQuestionJa ?? "",
          targetTranscriptJa: params.transcriptJa,
          transcriptJa: params.transcriptJa
        })
      }
    ]
  });
}
