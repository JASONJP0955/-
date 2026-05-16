import type { CoachFeedback, CoachQuickReply, CoachReply, Difficulty } from "@/types/coach";
import { createResponseJson } from "@/lib/openai";

type StarterTopic = {
  topic: string;
  starter: string;
};

const starters: Record<Difficulty, StarterTopic[]> = {
  beginner: [
    { topic: "daily life", starter: "こんにちは。今日はどんな一日でしたか？学校や仕事、家でのことなど、簡単に話してみてください。" },
    { topic: "favorite food", starter: "好きな食べ物について話しましょう。何が好きですか？いつ、だれと食べることが多いですか？" },
    { topic: "weekend plans", starter: "週末の予定について聞かせてください。どこへ行きたいですか？そこで何をしたいですか？" },
    { topic: "home and room", starter: "あなたの家や部屋について話しましょう。部屋には何がありますか？一番好きな場所はどこですか？" },
    { topic: "daily routine", starter: "毎日の習慣について教えてください。朝起きてから、まず何をしますか？夜は何時ごろ寝ますか？" },
    { topic: "shopping", starter: "買い物について話しましょう。最近、何を買いましたか？それはどこで買いましたか？" },
    { topic: "favorite season", starter: "好きな季節について教えてください。春、夏、秋、冬の中でどれが好きですか？その理由も話してみましょう。" },
    { topic: "family", starter: "家族について話しましょう。家族は何人ですか？よく一緒に何をしますか？" },
    { topic: "hobbies", starter: "趣味について教えてください。時間があるとき、何をするのが好きですか？いつからその趣味を始めましたか？" },
    { topic: "transportation", starter: "普段はどうやって学校や仕事に行きますか？電車、バス、自転車など、よく使う交通手段について話しましょう。" },
    { topic: "weather", starter: "今日の天気はどうですか？暑い、寒い、雨が降っているなど、外の様子を説明してみてください。" },
    { topic: "school subjects", starter: "学校で好きな科目、または苦手な科目は何ですか？どうしてそう思いますか？" },
    { topic: "morning habits", starter: "朝の過ごし方について話しましょう。何時に起きますか？朝ごはんはよく何を食べますか？" },
    { topic: "pets", starter: "ペットについて話しましょう。ペットを飼っていますか？飼っていない場合は、どんな動物が好きですか？" },
    { topic: "favorite place", starter: "よく行く場所について教えてください。そこはどんな場所ですか？どうしてよく行きますか？" },
    { topic: "birthday", starter: "誕生日について話しましょう。誕生日には何をしたいですか？今まででうれしかったプレゼントはありますか？" },
    { topic: "clothes", starter: "服について話しましょう。普段どんな服を着ることが多いですか？好きな色やスタイルも教えてください。" }
  ],
  intermediate: [
    { topic: "new challenge", starter: "最近、何か新しく始めたことはありますか？始めた理由や、続けてみて感じたことも一緒に話してみてください。" },
    { topic: "Japanese study difficulties", starter: "日本語を勉強していて、一番難しいと感じるところは何ですか？文法、発音、会話など、具体的な場面を挙げて説明してみましょう。" },
    { topic: "Japan travel plan", starter: "旅行するとしたら、日本のどの町に行ってみたいですか？その町で見たいもの、食べたいもの、体験したいことも教えてください。" },
    { topic: "healthy lifestyle", starter: "健康のために気をつけていることはありますか？食事、運動、睡眠など、自分の生活習慣について話してみましょう。" },
    { topic: "busy work or school", starter: "仕事や学校で最近忙しかったことについて話してください。何が大変でしたか？どうやって乗り越えましたか？" },
    { topic: "friendship", starter: "友達と過ごす時間について話しましょう。よく何をしますか？一人で過ごす時間と比べて、どちらが好きですか？" },
    { topic: "Japanese culture", starter: "日本の文化で興味があるものは何ですか？アニメ、音楽、料理、祭り、礼儀など、理由も一緒に説明してみましょう。" },
    { topic: "movie or drama", starter: "最近見た映画、ドラマ、動画について教えてください。どんな内容でしたか？人におすすめしたいと思いましたか？" },
    { topic: "part-time job", starter: "アルバイトや仕事の経験について話しましょう。どんな仕事をしたことがありますか？大変だったことや学んだことも教えてください。" },
    { topic: "restaurant experience", starter: "最近行ったレストランやカフェについて話してください。何を食べましたか？雰囲気やサービスはどうでしたか？" },
    { topic: "online shopping", starter: "ネットショッピングについてどう思いますか？便利だと思う点と、少し心配な点を自分の経験と一緒に話してみましょう。" },
    { topic: "exercise habit", starter: "運動習慣について話しましょう。最近どんな運動をしましたか？続けるために工夫していることはありますか？" },
    { topic: "language exchange", starter: "外国語を練習する相手がいるとしたら、どんな話題で話したいですか？会話練習で不安なことも教えてください。" },
    { topic: "saving money", starter: "お金の使い方について話しましょう。最近節約したこと、または少し高くても買ってよかったものはありますか？" },
    { topic: "city life", starter: "今住んでいる町の良いところと不便なところは何ですか？具体的な場所や生活の場面を使って説明してみましょう。" },
    { topic: "memorable gift", starter: "今までにもらってうれしかったプレゼント、または人にあげて喜ばれたプレゼントについて話してください。" },
    { topic: "stress relief", starter: "ストレスがたまったとき、どうやって気分転換をしますか？自分に合っている方法と、その理由を話してみましょう。" }
  ],
  advanced: [
    { topic: "recent news", starter: "最近のニュースで気になった話題について、あなたの意見を聞かせてください。なぜその話題が気になったのか、賛成か反対かも含めて話してみましょう。" },
    { topic: "AI in work and study", starter: "仕事や勉強で AI を使うことについて、良い点と心配な点は何だと思いますか？自分の経験や身近な例を使って説明してみてください。" },
    { topic: "effective language practice", starter: "日本語で自然に話すために、どんな練習が一番効果的だと思いますか？あなた自身の学習方法と、その方法の長所や限界について話してみましょう。" },
    { topic: "urban and rural life", starter: "都市で暮らすことと地方で暮らすことには、それぞれどんな良さがありますか？あなたならどちらを選びたいか、理由を含めて話してください。" },
    { topic: "grammar and speaking courage", starter: "外国語を学ぶとき、完璧な文法と実際に話す勇気では、どちらがより大切だと思いますか？自分の経験を交えて説明してみましょう。" },
    { topic: "future work style", starter: "将来の働き方についてどう考えていますか？リモートワーク、オフィス勤務、副業などについて、メリットとデメリットを話してみてください。" },
    { topic: "education and exams", starter: "試験中心の教育についてどう思いますか？良い点と問題点を挙げながら、自分の経験も交えて話してみましょう。" },
    { topic: "social media", starter: "SNS は人間関係に良い影響を与えていると思いますか？それとも悪い影響のほうが大きいと思いますか？理由を説明してください。" },
    { topic: "environmental action", starter: "環境問題に対して、個人ができることにはどんな意味があると思いますか？身近な行動と社会全体の取り組みを比べて話してみましょう。" },
    { topic: "career choice", starter: "仕事を選ぶとき、給料、安定、やりがい、成長の中で何を一番重視しますか？理由と具体例を挙げて説明してください。" },
    { topic: "living abroad", starter: "海外で生活するとしたら、どんな力が一番必要だと思いますか？言語、文化理解、人間関係などの観点から話してみましょう。" },
    { topic: "tradition and change", starter: "伝統を守ることと、新しい考え方を受け入れることは、どのようにバランスを取るべきだと思いますか？" },
    { topic: "technology and privacy", starter: "便利なテクノロジーとプライバシーの保護は、どちらを優先すべき場面が多いと思いますか？具体例を使って話してください。" },
    { topic: "aging society", starter: "少子高齢化が進む社会では、どんな課題が生まれると思いますか？家族、仕事、地域社会の視点から意見を述べてください。" },
    { topic: "tourism and local communities", starter: "観光客が増えることは地域にとって良いことだと思いますか？経済、生活環境、文化保護の面から考えてみましょう。" },
    { topic: "failure and growth", starter: "失敗は人を成長させると思いますか？自分や周りの経験を例にして、失敗から学ぶことについて話してください。" }
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

export async function continueConversation(params: {
  transcriptJa: string;
  topic: string;
  difficulty: Difficulty;
  history: { role: "assistant" | "user"; text: string }[];
}) {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["transcriptJa", "nextReplyJa", "topicState", "nextTopicSuggestionZh"],
    properties: {
      transcriptJa: { type: "string" },
      nextReplyJa: { type: "string", minLength: 60 },
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
          "You are a warm Japanese conversation partner for Chinese native speakers. Reply only in Japanese. Do not give correction advice here. Continue the topic naturally with 2 to 4 sentences, roughly 80 to 160 Japanese characters. Include a short reaction and one follow-up question."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Continue the Japanese conversation quickly.",
          topic: params.topic,
          difficulty: params.difficulty,
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
          "You are a Japanese speaking coach for Chinese native speakers. Feedback must be concise Chinese text. Do not continue the conversation here. In errorFeedback, list concrete problems in the learner's exact utterance, including vocabulary, grammar, particles, tense, word choice, and unnatural expressions. For each item, cite the original Japanese fragment, explain the issue in Chinese, give an actionable Chinese suggestion, and provide one corrected Japanese version. If there is no clear error, include only one improvement item about richness or naturalness. Pronunciation feedback is based on transcript-level evidence, so phrase it as likely or practice-focused unless the issue is certain."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Evaluate the learner's Japanese answer. Return only text feedback and scores.",
          topic: params.topic,
          difficulty: params.difficulty,
          history: params.history.slice(-8),
          transcriptJa: params.transcriptJa
        })
      }
    ]
  });
}
