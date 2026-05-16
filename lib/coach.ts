import type { CoachReply, Difficulty } from "@/types/coach";
import { createResponseJson } from "@/lib/openai";

const starters: Record<Difficulty, string[]> = {
  beginner: [
    "こんにちは。今日は何をしましたか？",
    "好きな食べ物は何ですか？どうして好きですか？",
    "週末はどこへ行きたいですか？"
  ],
  intermediate: [
    "最近、何か新しく始めたことはありますか？",
    "日本語を勉強していて、一番難しいと感じるところは何ですか？",
    "旅行するとしたら、日本のどの町に行ってみたいですか？"
  ],
  advanced: [
    "最近のニュースで気になった話題について、あなたの意見を聞かせてください。",
    "仕事や勉強で AI を使うことについて、良い点と心配な点は何だと思いますか？",
    "日本語で自然に話すために、どんな練習が一番効果的だと思いますか？"
  ]
};

export function createSessionStarter(difficulty: Difficulty) {
  const pool = starters[difficulty] ?? starters.beginner;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function demoReply(transcriptJa = "今日は学校に行きました。"): CoachReply {
  return {
    transcriptJa,
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
    nextReplyJa: "いいですね。学校では何を勉強しましたか？",
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
      nextReplyJa: { type: "string" },
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
      verbosity: "low",
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
          "You are a Japanese speaking coach for Chinese native speakers. Continue the conversation in Japanese. Feedback must be concise Chinese text. The spoken assistant reply must never read correction advice aloud. Pronunciation feedback is based on transcript-level evidence, so phrase it as likely or practice-focused unless the issue is certain. Keep the next Japanese reply to one or two natural sentences."
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
