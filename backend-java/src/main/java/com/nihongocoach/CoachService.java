package com.nihongocoach;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

final class CoachService {
  private final OpenAiClient openAi;
  private final SpeechClient speech;
  private final List<StarterTopic> starters;
  private final Random random = new Random();

  CoachService(OpenAiClient openAi, SpeechClient speech) {
    this.openAi = openAi;
    this.speech = speech;
    this.starters = loadStarters();
  }

  Map<String, Object> status() {
    boolean openaiConfigured = openAi.hasKey();
    boolean googleConfigured = speech.googleConfigured();
    boolean speechConfigured = speech.speechConfigured();
    Map<String, Object> status = object();
    status.put("demoMode", !(openaiConfigured && speechConfigured));
    status.put("openaiConfigured", openaiConfigured);
    status.put("googleConfigured", googleConfigured);
    status.put("speechConfigured", speechConfigured);
    status.put("sttProvider", speech.provider());
    status.put("sttModel", speech.sttModel());
    return status;
  }

  Map<String, Object> startSession() throws IOException, InterruptedException {
    StarterTopic selected = starters.get(random.nextInt(starters.size()));
    Map<String, Object> payload = object();
    payload.put("sessionId", UUID.randomUUID().toString());
    payload.put("topic", selected.topic());
    payload.put("difficulty", "intermediate");
    payload.put("assistantText", selected.starter());
    payload.put("demoMode", !openAi.hasKey());
    if (openAi.hasKey()) {
      payload.put("audioBase64", openAi.synthesizeJapanese(selected.starter()));
    }
    return payload;
  }

  Map<String, Object> respond(MultipartForm form) throws IOException, InterruptedException {
    MultipartForm.FilePart audio = form.files.get("audio");
    if (audio == null) throw new IllegalArgumentException("没有收到录音文件。");

    if (!openAi.hasKey()) {
      Map<String, Object> demo = demoReply("今日は学校に行きました。");
      demo.put("audioBase64", null);
      demo.put("demoMode", true);
      return pickFastReply(demo);
    }

    String transcriptJa = speech.transcribeJapanese(audio);
    Map<String, Object> reply = continueConversation(
      transcriptJa,
      form.fields.getOrDefault("topic", "daily conversation"),
      normalizeDifficulty(form.fields.get("difficulty")),
      safeInt(form.fields.get("turnCount"), 1),
      form.fields.getOrDefault("history", "[]")
    );
    reply.put("transcriptJa", transcriptJa);
    reply.put("audioBase64", openAi.synthesizeJapanese(stringValue(reply.get("nextReplyJa"))));
    reply.put("demoMode", false);
    return reply;
  }

  Map<String, Object> feedback(MultipartForm form) throws IOException, InterruptedException {
    if (!form.files.containsKey("audio")) throw new IllegalArgumentException("没有收到录音文件。");
    String transcriptJa = form.fields.getOrDefault("transcriptJa", "");
    String nextReplyJa = form.fields.getOrDefault("nextReplyJa", "");
    if (transcriptJa.isBlank() || nextReplyJa.isBlank()) {
      throw new IllegalArgumentException("缺少转写文本或机器人回复。");
    }

    if (!openAi.hasKey()) {
      Map<String, Object> demo = demoReply(transcriptJa);
      demo.put("nextReplyJa", nextReplyJa);
      demo.put("topicState", normalizeTopicState(form.fields.get("topicState")));
      demo.put("nextTopicSuggestionZh", form.fields.getOrDefault("nextTopicSuggestionZh", ""));
      demo.put("demoMode", true);
      demo.put("persisted", false);
      return demo;
    }

    Map<String, Object> feedback = evaluateFeedback(
      transcriptJa,
      form.fields.getOrDefault("topic", "daily conversation"),
      normalizeDifficulty(form.fields.get("difficulty")),
      form.fields.getOrDefault("contextQuestionJa", "")
    );
    feedback.put("transcriptJa", transcriptJa);
    feedback.put("nextReplyJa", nextReplyJa);
    feedback.put("topicState", normalizeTopicState(form.fields.get("topicState")));
    feedback.put("nextTopicSuggestionZh", form.fields.getOrDefault("nextTopicSuggestionZh", ""));
    feedback.put("demoMode", false);
    return feedback;
  }

  Map<String, Object> tts(String text) throws IOException, InterruptedException {
    Map<String, Object> response = object();
    if (!openAi.hasKey()) {
      response.put("audioBase64", null);
      response.put("demoMode", true);
      return response;
    }
    response.put("audioBase64", openAi.synthesizeJapanese(text));
    response.put("demoMode", false);
    return response;
  }

  private Map<String, Object> continueConversation(
    String transcriptJa,
    String topic,
    String difficulty,
    int turnCount,
    String rawHistory
  ) throws IOException, InterruptedException {
    boolean shouldShiftTopic = turnCount >= 3 && turnCount % 3 == 0;
    List<Object> history = trimHistory(rawHistory, 8);
    history.add(object("role", "user", "text", transcriptJa));

    Map<String, Object> payload = responsePayload(
      OpenAiClient.env("OPENAI_CHAT_MODEL", "gpt-5-mini"),
      "minimal",
      "low",
      "japanese_voice_coach_fast_reply",
      fastReplySchema(),
      "You are a warm Japanese conversation partner for Chinese native speakers. Reply only in Japanese. Do not give correction advice here. Continue the topic naturally with 2 to 4 sentences, roughly 80 to 160 Japanese characters. Include a short reaction and one follow-up question. If shouldShiftTopic is true, briefly acknowledge the learner's answer, then clearly move to a fresh everyday conversation topic with a new question. Do not keep expanding the old topic when shouldShiftTopic is true.",
      object(
        "task", "Continue the Japanese conversation quickly.",
        "topic", topic,
        "difficulty", difficulty,
        "turnCount", turnCount,
        "shouldShiftTopic", shouldShiftTopic,
        "history", history,
        "transcriptJa", transcriptJa
      )
    );
    return openAi.createResponseJson(payload);
  }

  private Map<String, Object> evaluateFeedback(
    String transcriptJa,
    String topic,
    String difficulty,
    String contextQuestionJa
  ) throws IOException, InterruptedException {
    Map<String, Object> payload = responsePayload(
      OpenAiClient.env("OPENAI_CHAT_MODEL", "gpt-5-mini"),
      "low",
      "medium",
      "japanese_voice_coach_feedback",
      feedbackSchema(),
      "You are a Japanese speaking coach for Chinese native speakers. Feedback must be concise Chinese text. Do not continue the conversation here. Analyze only targetTranscriptJa. Do not analyze contextQuestionJa or any previous conversation text. In errorFeedback, list concrete problems in targetTranscriptJa only, including vocabulary, grammar, particles, tense, word choice, and unnatural expressions. For each item, cite an original Japanese fragment that appears in targetTranscriptJa, explain the issue in Chinese, give an actionable Chinese suggestion, and provide one corrected Japanese version. If there is no clear error, include only one improvement item about richness or naturalness. Pronunciation feedback is based on transcript-level evidence, so phrase it as likely or practice-focused unless the issue is certain.",
      object(
        "task", "Evaluate only targetTranscriptJa. Return only text feedback and scores for targetTranscriptJa.",
        "topic", topic,
        "difficulty", difficulty,
        "contextQuestionJa", contextQuestionJa,
        "targetTranscriptJa", transcriptJa,
        "transcriptJa", transcriptJa
      )
    );
    return openAi.createResponseJson(payload);
  }

  private Map<String, Object> responsePayload(
    String model,
    String reasoningEffort,
    String verbosity,
    String schemaName,
    Map<String, Object> schema,
    String developerMessage,
    Map<String, Object> userContent
  ) {
    return object(
      "model", model,
      "reasoning", object("effort", reasoningEffort),
      "text", object(
        "verbosity", verbosity,
        "format", object("type", "json_schema", "name", schemaName, "schema", schema, "strict", true)
      ),
      "input", list(
        object("role", "developer", "content", developerMessage),
        object("role", "user", "content", Json.stringify(userContent))
      )
    );
  }

  private Map<String, Object> fastReplySchema() {
    return object(
      "type", "object",
      "additionalProperties", false,
      "required", list("nextReplyJa", "topicState", "nextTopicSuggestionZh"),
      "properties", object(
        "nextReplyJa", object("type", "string", "minLength", 60),
        "topicState", object("type", "string", "enum", list("continue", "shift", "wrap_up")),
        "nextTopicSuggestionZh", object("type", "string")
      )
    );
  }

  private Map<String, Object> feedbackSchema() {
    Map<String, Object> errorItem = object(
      "type", "object",
      "additionalProperties", false,
      "required", list("categoryZh", "originalJa", "issueZh", "suggestionZh", "correctionJa"),
      "properties", object(
        "categoryZh", object("type", "string"),
        "originalJa", object("type", "string"),
        "issueZh", object("type", "string"),
        "suggestionZh", object("type", "string"),
        "correctionJa", object("type", "string")
      )
    );
    Map<String, Object> grammarItem = object(
      "type", "object",
      "additionalProperties", false,
      "required", list("title", "explanationZh", "correctionJa"),
      "properties", object(
        "title", object("type", "string"),
        "explanationZh", object("type", "string"),
        "correctionJa", object("type", "string")
      )
    );
    Map<String, Object> pronunciationItem = object(
      "type", "object",
      "additionalProperties", false,
      "required", list("target", "issueZh", "practiceJa"),
      "properties", object(
        "target", object("type", "string"),
        "issueZh", object("type", "string"),
        "practiceJa", object("type", "string")
      )
    );

    return object(
      "type", "object",
      "additionalProperties", false,
      "required", list(
        "transcriptJa",
        "errorFeedback",
        "grammarFeedback",
        "pronunciationFeedback",
        "naturalExpressionJa",
        "scores"
      ),
      "properties", object(
        "transcriptJa", object("type", "string"),
        "errorFeedback", object("type", "array", "minItems", 0, "maxItems", 4, "items", errorItem),
        "grammarFeedback", object("type", "array", "minItems", 0, "maxItems", 3, "items", grammarItem),
        "pronunciationFeedback", object("type", "array", "minItems", 0, "maxItems", 3, "items", pronunciationItem),
        "naturalExpressionJa", object("type", "string"),
        "scores", object(
          "type", "object",
          "additionalProperties", false,
          "required", list("grammar", "pronunciation", "fluency"),
          "properties", object(
            "grammar", object("type", "number", "minimum", 0, "maximum", 100),
            "pronunciation", object("type", "number", "minimum", 0, "maximum", 100),
            "fluency", object("type", "number", "minimum", 0, "maximum", 100)
          )
        )
      )
    );
  }

  private Map<String, Object> demoReply(String transcriptJa) {
    return object(
      "transcriptJa", transcriptJa,
      "errorFeedback", list(
        object(
          "categoryZh", "表达完整度",
          "originalJa", transcriptJa,
          "issueZh", "这句话基本可以理解，但信息量比较少，听起来像只回答了一半。",
          "suggestionZh", "可以补充和谁一起、做了什么、感觉怎么样，让回答更自然。",
          "correctionJa", "今日は学校に行って、友達と少し勉強しました。"
        )
      ),
      "grammarFeedback", list(
        object(
          "title", "自然さ",
          "explanationZh", "语法基本正确。想让回答更丰富时，可以补充后续动作或感受。",
          "correctionJa", "今日は学校に行って、友達と少し話しました。"
        )
      ),
      "pronunciationFeedback", list(
        object("target", "学校", "issueZh", "注意「がっこう」中间的促音，需要有一个短暂停顿。", "practiceJa", "がっ・こう"),
        object("target", "行きました", "issueZh", "「ました」结尾不要吞音，最后的「た」要轻但清楚。", "practiceJa", "いきました")
      ),
      "naturalExpressionJa", "今日は学校に行って、友達と勉強しました。",
      "nextReplyJa", "いいですね。学校ではどんなことを勉強しましたか？その授業は難しかったですか、それとも楽しかったですか？",
      "topicState", "continue",
      "nextTopicSuggestionZh", "继续聊学校和学习内容。",
      "scores", object("grammar", 88, "pronunciation", 74, "fluency", 80)
    );
  }

  private Map<String, Object> pickFastReply(Map<String, Object> demo) {
    return object(
      "transcriptJa", demo.get("transcriptJa"),
      "nextReplyJa", demo.get("nextReplyJa"),
      "topicState", demo.get("topicState"),
      "nextTopicSuggestionZh", demo.get("nextTopicSuggestionZh"),
      "audioBase64", null,
      "demoMode", true
    );
  }

  private List<Object> trimHistory(String rawHistory, int keep) {
    try {
      List<Object> items = Json.parseArray(rawHistory);
      if (items.size() <= keep) return new ArrayList<>(items);
      return new ArrayList<>(items.subList(items.size() - keep, items.size()));
    } catch (RuntimeException error) {
      return new ArrayList<>();
    }
  }

  private String normalizeDifficulty(String difficulty) {
    if ("beginner".equals(difficulty) || "advanced".equals(difficulty)) return difficulty;
    return "intermediate";
  }

  private String normalizeTopicState(String state) {
    if ("shift".equals(state) || "wrap_up".equals(state)) return state;
    return "continue";
  }

  private int safeInt(String value, int fallback) {
    try {
      return value == null ? fallback : Integer.parseInt(value);
    } catch (NumberFormatException error) {
      return fallback;
    }
  }

  private String stringValue(Object value) {
    return value instanceof String text ? text : "";
  }

  private List<StarterTopic> loadStarters() {
    try (InputStream input = CoachService.class.getClassLoader().getResourceAsStream("starter-topics.json")) {
      if (input == null) throw new IllegalStateException("starter-topics.json not found.");
      String json = new String(input.readAllBytes(), StandardCharsets.UTF_8);
      List<Object> items = Json.parseArray(json);
      List<StarterTopic> topics = new ArrayList<>();
      for (Object item : items) {
        if (item instanceof Map<?, ?> map) {
          Object topic = map.get("topic");
          Object starter = map.get("starter");
          if (topic instanceof String topicText && starter instanceof String starterText) {
            topics.add(new StarterTopic(topicText, starterText));
          }
        }
      }
      if (topics.isEmpty()) throw new IllegalStateException("No starter topics loaded.");
      return topics;
    } catch (IOException error) {
      throw new IllegalStateException("Failed to load starter topics.", error);
    }
  }

  private record StarterTopic(String topic, String starter) {}

  @SafeVarargs
  private static List<Object> list(Object... values) {
    return new ArrayList<>(List.of(values));
  }

  private static Map<String, Object> object(Object... pairs) {
    Map<String, Object> map = new LinkedHashMap<>();
    for (int index = 0; index + 1 < pairs.length; index += 2) {
      map.put(String.valueOf(pairs[index]), pairs[index + 1]);
    }
    return map;
  }
}
