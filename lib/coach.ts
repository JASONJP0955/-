import type { CoachReply, Difficulty } from "@/types/coach";
import { createResponseJson } from "@/lib/openai";

const starters: Record<Difficulty, string[]> = {
  beginner: [
    "こんにちは。今日はどんな一日でしたか？学校や仕事、家でのことなど、簡単に話してみてください。",
    "好きな食べ物について話しましょう。何が好きですか？いつ、だれと食べることが多いですか？",
    "週末の予定について聞かせてください。どこへ行きたいですか？そこで何をしたいですか？",
    "あなたの家や部屋について話しましょう。部屋には何がありますか？一番好きな場所はどこですか？",
    "毎日の習慣について教えてください。朝起きてから、まず何をしますか？夜は何時ごろ寝ますか？",
    "買い物について話しましょう。最近、何を買いましたか？それはどこで買いましたか？",
    "好きな季節について教えてください。春、夏、秋、冬の中でどれが好きですか？その理由も話してみましょう。"
  ],
  intermediate: [
    "最近、何か新しく始めたことはありますか？始めた理由や、続けてみて感じたことも一緒に話してみてください。",
    "日本語を勉強していて、一番難しいと感じるところは何ですか？文法、発音、会話など、具体的な場面を挙げて説明してみましょう。",
    "旅行するとしたら、日本のどの町に行ってみたいですか？その町で見たいもの、食べたいもの、体験したいことも教えてください。",
    "健康のために気をつけていることはありますか？食事、運動、睡眠など、自分の生活習慣について話してみましょう。",
    "仕事や学校で最近忙しかったことについて話してください。何が大変でしたか？どうやって乗り越えましたか？",
    "友達と過ごす時間について話しましょう。よく何をしますか？一人で過ごす時間と比べて、どちらが好きですか？",
    "日本の文化で興味があるものは何ですか？アニメ、音楽、料理、祭り、礼儀など、理由も一緒に説明してみましょう。",
    "最近見た映画、ドラマ、動画について教えてください。どんな内容でしたか？人におすすめしたいと思いましたか？"
  ],
  advanced: [
    "最近のニュースで気になった話題について、あなたの意見を聞かせてください。なぜその話題が気になったのか、賛成か反対かも含めて話してみましょう。",
    "仕事や勉強で AI を使うことについて、良い点と心配な点は何だと思いますか？自分の経験や身近な例を使って説明してみてください。",
    "日本語で自然に話すために、どんな練習が一番効果的だと思いますか？あなた自身の学習方法と、その方法の長所や限界について話してみましょう。",
    "都市で暮らすことと地方で暮らすことには、それぞれどんな良さがありますか？あなたならどちらを選びたいか、理由を含めて話してください。",
    "外国語を学ぶとき、完璧な文法と実際に話す勇気では、どちらがより大切だと思いますか？自分の経験を交えて説明してみましょう。",
    "将来の働き方についてどう考えていますか？リモートワーク、オフィス勤務、副業などについて、メリットとデメリットを話してみてください。"
  ]
};

export function createSessionStarter(difficulty: Difficulty) {
  const pool = starters[difficulty] ?? starters.beginner;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function demoReply(transcriptJa = "今日は学校に行きました。"): CoachReply {
  return {
    transcriptJa,
    errorFeedback: [
      {
        categoryZh: "表达完整度",
        originalJa: "今日は学校に行きました。",
        issueZh: "这句话本身没有明显错误，但信息比较少，听起来像只回答了一半。",
        suggestionZh: "可以补充和谁一起、做了什么、感觉怎么样，让回答更自然。",
        correctionJa: "今日は学校に行って、友達と少し勉強しました。"
      }
    ],
    grammarFeedback: [
      {
        title: "自然さ",
        explanationZh: "这句话语法基本正确。如果想让回答更丰富，可以补充后续动作或感受。",
        correctionJa: "今日は学校に行って、友達と少し話しました。"
      }
    ],
    pronunciationFeedback: [
      {
        target: "学校",
        issueZh: "注意「がっこう」中间的促音，需要有一个短暂停顿。",
        practiceJa: "がっ・こう"
      },
      {
        target: "行きました",
        issueZh: "「ました」结尾不要吞音，最后的「た」要轻但清楚。",
        practiceJa: "いきました"
      }
    ],
    naturalExpressionJa: "今日は学校に行って、友達と勉強しました。",
    nextReplyJa:
      "いいですね。学校で勉強したことについて、もう少し詳しく聞きたいです。たとえば、どの科目を勉強しましたか？その授業は難しかったですか、それとも楽しかったですか？",
    topicState: "continue",
    nextTopicSuggestionZh: "继续聊学校和学习内容。",
    scores: {
      grammar: 88,
      pronunciation: 74,
      fluency: 80
    }
  };
}

export async function evaluateAndContinue(params: {
  transcriptJa: string;
  topic: string;
  difficulty: Difficulty;
  history: { role: "assistant" | "user"; text: string }[];
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
      "nextReplyJa",
      "topicState",
      "nextTopicSuggestionZh",
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
      nextReplyJa: { type: "string", minLength: 60 },
      topicState: { type: "string", enum: ["continue", "shift", "wrap_up"] },
      nextTopicSuggestionZh: { type: "string" },
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

  return createResponseJson<CoachReply>({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5-mini",
    reasoning: { effort: "low" },
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: "japanese_voice_coach_reply",
        schema,
        strict: true
      }
    },
    input: [
      {
        role: "developer",
        content:
          "You are a Japanese speaking coach for Chinese native speakers. Continue the conversation in Japanese. Feedback must be concise Chinese text. The spoken assistant reply must never read correction advice aloud. In errorFeedback, list concrete problems in the learner's exact utterance, including vocabulary, grammar, particles, tense, word choice, and unnatural expressions. For each item, cite the original Japanese fragment, explain the issue in Chinese, give an actionable Chinese suggestion, and provide one corrected Japanese version. If there is no clear error, include only one improvement item about richness or naturalness. Pronunciation feedback is based on transcript-level evidence, so phrase it as likely or practice-focused unless the issue is certain. Make nextReplyJa warmer and longer than a normal chatbot turn: 3 to 5 natural Japanese sentences, roughly 120 to 220 Japanese characters. Include a short reaction to the learner's answer, one topic-expanding detail or example, and one specific follow-up question. Do not reply with only a short standalone question."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Evaluate the learner's Japanese answer and continue the conversation.",
          topic: params.topic,
          difficulty: params.difficulty,
          history: params.history.slice(-8),
          transcriptJa: params.transcriptJa
        })
      }
    ]
  });
}
