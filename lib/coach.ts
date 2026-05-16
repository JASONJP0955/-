import type { CoachFeedback, CoachQuickReply, CoachReply, Difficulty } from "@/types/coach";
import { createResponseJson } from "@/lib/openai";

type StarterTopic = {
  topic: string;
  starter: string;
};

const starters: StarterTopic[] = [
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
  { topic: "clothes", starter: "服について話しましょう。普段どんな服を着ることが多いですか？好きな色やスタイルも教えてください。" },
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
  { topic: "stress relief", starter: "ストレスがたまったとき、どうやって気分転換をしますか？自分に合っている方法と、その理由を話してみましょう。" },
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
  { topic: "failure and growth", starter: "失敗は人を成長させると思いますか？自分や周りの経験を例にして、失敗から学ぶことについて話してください。" },
  { topic: "cooking", starter: "料理について話しましょう。最近作った料理、または作ってみたい料理は何ですか？その理由も教えてください。" },
  { topic: "breakfast", starter: "朝ごはんについて話しましょう。普段何を食べますか？朝ごはんを食べる日と食べない日で気分は変わりますか？" },
  { topic: "coffee and tea", starter: "コーヒーやお茶について話しましょう。どちらが好きですか？いつ、どんな場所で飲むことが多いですか？" },
  { topic: "music", starter: "音楽について教えてください。最近よく聞いている曲や歌手はいますか？どんな気分のときに聞きますか？" },
  { topic: "books and reading", starter: "本や読書について話しましょう。最近読んだ本、または読んでみたい本はありますか？" },
  { topic: "games", starter: "ゲームについてどう思いますか？よく遊ぶゲームや、ゲームから学べることについて話してみてください。" },
  { topic: "smartphone habits", starter: "スマートフォンの使い方について話しましょう。毎日どんなアプリをよく使いますか？使いすぎることはありますか？" },
  { topic: "sleep quality", starter: "睡眠について話しましょう。最近よく眠れていますか？寝る前にしている習慣があれば教えてください。" },
  { topic: "weekend rest", starter: "週末にしっかり休むために、どんな過ごし方をしますか？外に出るのと家で過ごすのでは、どちらが好きですか？" },
  { topic: "future dream", starter: "将来やってみたいことについて話してください。仕事、勉強、旅行など、どんな夢や目標がありますか？" },
  { topic: "childhood memory", starter: "子どものころの思い出について話しましょう。今でもよく覚えている場所や出来事はありますか？" },
  { topic: "favorite teacher", starter: "印象に残っている先生や先輩について話してください。その人からどんな影響を受けましたか？" },
  { topic: "public manners", starter: "公共のマナーについてどう思いますか？電車、レストラン、道などで大切だと思うマナーを話してください。" },
  { topic: "train commute", starter: "通勤や通学の時間について話しましょう。移動中は何をしていますか？混んでいる時間はどう感じますか？" },
  { topic: "convenience stores", starter: "コンビニについて話しましょう。よく買うものは何ですか？便利だと思う点や、少し高いと思う点も教えてください。" },
  { topic: "emergency preparation", starter: "災害への備えについて話しましょう。家に準備しているものや、これから準備したいものはありますか？" },
  { topic: "moving house", starter: "引っ越しについて話しましょう。住む場所を選ぶとき、家賃、交通、周りの環境の中で何を重視しますか？" },
  { topic: "neighborhood", starter: "近所について話してください。よく行く店や公園、便利な場所、不便な場所はありますか？" },
  { topic: "festivals", starter: "祭りやイベントについて話しましょう。行ったことがあるイベント、または行ってみたいイベントはありますか？" },
  { topic: "souvenirs", starter: "お土産について話しましょう。旅行先でどんなものを買いますか？人にあげるとき、何を考えて選びますか？" },
  { topic: "studying abroad", starter: "留学についてどう思いますか？もし留学するとしたら、どんなことを学びたいですか？不安なことも話してください。" },
  { topic: "housework", starter: "家事について話しましょう。料理、掃除、洗濯の中で得意なものや苦手なものはありますか？" },
  { topic: "time management", starter: "時間の使い方について話してください。忙しい日に予定をどうやって整理しますか？" },
  { topic: "goal setting", starter: "目標を立てることについて話しましょう。最近立てた目標はありますか？それを続けるために何をしていますか？" },
  { topic: "communication style", starter: "人とのコミュニケーションで大切だと思うことは何ですか？聞く力、話す力、気遣いなどから考えてみましょう。" },
  { topic: "Japanese mistakes", starter: "日本語を話すとき、よくしてしまう間違いはありますか？その間違いに気づいたきっかけも教えてください。" },
  { topic: "pronunciation practice", starter: "発音練習について話しましょう。日本語の中で言いにくい音や言葉はありますか？どう練習していますか？" },
  { topic: "kanji study", starter: "漢字の勉強についてどう感じていますか？覚えやすい漢字、覚えにくい漢字、使っている勉強法を話してください。" },
  { topic: "job interview", starter: "面接について話しましょう。面接でよく聞かれる質問にどう答えるとよいと思いますか？" },
  { topic: "customer service", starter: "店やレストランの接客について話してください。良いサービスだと感じるのはどんなときですか？" },
  { topic: "hospital visit", starter: "病院に行く場面について練習しましょう。体調が悪いとき、どんな症状をどう説明しますか？" },
  { topic: "bank and post office", starter: "銀行や郵便局での手続きについて話しましょう。どんな場面で行くことがありますか？不安な表現はありますか？" },
  { topic: "travel trouble", starter: "旅行中のトラブルについて話しましょう。道に迷う、忘れ物をするなど、起きたらどう対応しますか？" },
  { topic: "hotel stay", starter: "ホテルに泊まるとき、何を重視しますか？値段、場所、部屋の広さ、朝食などについて話してください。" },
  { topic: "asking directions", starter: "道を聞く場面を練習しましょう。知らない場所に行くとき、どんなふうに質問しますか？" },
  { topic: "hobbies with friends", starter: "友達と一緒に楽しめる趣味について話してください。一人でする趣味と比べて、どんな良さがありますか？" },
  { topic: "watching sports", starter: "スポーツを見ることについて話しましょう。好きなスポーツやチームはありますか？応援するときどんな気持ちになりますか？" },
  { topic: "museums", starter: "博物館や美術館について話しましょう。行ったことがある場所、または行ってみたい展示はありますか？" },
  { topic: "art and design", starter: "絵、写真、デザインなどのアートについてどう思いますか？好きな作品や雰囲気があれば教えてください。" },
  { topic: "nature", starter: "自然の中で過ごすことについて話しましょう。山、海、公園など、どんな場所でリラックスできますか？" },
  { topic: "mountains and sea", starter: "旅行に行くなら山と海のどちらが好きですか？そこで何をしたいか、理由も一緒に話してください。" },
  { topic: "hot springs", starter: "温泉について話しましょう。温泉に行ったことがありますか？行くならどんな場所の温泉がいいですか？" },
  { topic: "local food", starter: "地域の料理について話してください。あなたの町や国で有名な食べ物は何ですか？どんな味ですか？" },
  { topic: "gifts for friends", starter: "友達にプレゼントを選ぶとしたら、どんなものを選びますか？相手の好みをどう考えますか？" },
  { topic: "online learning", starter: "オンライン学習について話しましょう。便利な点と難しい点は何ですか？自分の経験も教えてください。" },
  { topic: "remote work", starter: "リモートワークについてどう思いますか？集中しやすい点、不便な点、人との関係について話してみましょう。" },
  { topic: "news habits", starter: "ニュースをどのように見ていますか？テレビ、SNS、ニュースアプリなど、よく使う方法と理由を教えてください。" },
  { topic: "food waste", starter: "食品ロスについて考えたことはありますか？家や店で食べ物を無駄にしないために何ができると思いますか？" },
  { topic: "volunteering", starter: "ボランティアについて話しましょう。参加したことがありますか？参加するとしたら、どんな活動に興味がありますか？" },
  { topic: "recycling", starter: "リサイクルやごみの分別について話してください。あなたの町ではどんなルールがありますか？面倒だと感じることはありますか？" }
];

export function createSessionStarter() {
  return starters[Math.floor(Math.random() * starters.length)];
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
  turnCount: number;
  history: { role: "assistant" | "user"; text: string }[];
}) {
  const shouldShiftTopic = params.turnCount >= 3 && params.turnCount % 3 === 0;
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["nextReplyJa", "topicState", "nextTopicSuggestionZh"],
    properties: {
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
          "You are a warm Japanese conversation partner for Chinese native speakers. Reply only in Japanese. Do not give correction advice here. Continue the topic naturally with 2 to 4 sentences, roughly 80 to 160 Japanese characters. Include a short reaction and one follow-up question. If shouldShiftTopic is true, briefly acknowledge the learner's answer, then clearly move to a fresh everyday conversation topic with a new question. Do not keep expanding the old topic when shouldShiftTopic is true."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Continue the Japanese conversation quickly.",
          topic: params.topic,
          difficulty: params.difficulty,
          turnCount: params.turnCount,
          shouldShiftTopic,
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
