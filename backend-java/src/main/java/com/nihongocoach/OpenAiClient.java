package com.nihongocoach;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

final class OpenAiClient {
  private static final String OPENAI_BASE_URL = "https://api.openai.com/v1";
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();

  boolean hasKey() {
    String key = env("OPENAI_API_KEY", "");
    return key.startsWith("sk-") && !key.equals("sk-your-key-here");
  }

  Map<String, Object> createResponseJson(Map<String, Object> payload) throws IOException, InterruptedException {
    HttpRequest request = HttpRequest.newBuilder(URI.create(OPENAI_BASE_URL + "/responses"))
      .timeout(Duration.ofSeconds(90))
      .header("Authorization", "Bearer " + apiKey())
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(Json.stringify(payload), StandardCharsets.UTF_8))
      .build();
    HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    requireOk(response.statusCode(), response.body(), "OpenAI Responses API failed");
    String output = extractResponseText(Json.parseObject(response.body()));
    if (output.isBlank()) throw new IllegalStateException("OpenAI response did not include text output.");
    return Json.parseObject(output);
  }

  String transcribeJapanese(MultipartForm.FilePart audio) throws IOException, InterruptedException {
    String boundary = "----java-openai-" + UUID.randomUUID();
    Map<String, String> fields = new LinkedHashMap<>();
    fields.put("model", env("OPENAI_STT_MODEL", "gpt-4o-transcribe"));
    fields.put("language", "ja");
    fields.put("response_format", "json");
    fields.put(
      "prompt",
      "Japanese learner speech. Transcribe only what the speaker says in Japanese. Preserve particles, verb endings, long vowels, and short pauses as accurately as possible."
    );
    MultipartForm.FilePart file = new MultipartForm.FilePart(
      "file",
      audio.fileName() == null || audio.fileName().isBlank() ? "answer.webm" : audio.fileName(),
      audio.contentType(),
      audio.bytes()
    );
    byte[] body = MultipartForm.build(fields, file, boundary);
    HttpRequest request = HttpRequest.newBuilder(URI.create(OPENAI_BASE_URL + "/audio/transcriptions"))
      .timeout(Duration.ofSeconds(90))
      .header("Authorization", "Bearer " + apiKey())
      .header("Content-Type", "multipart/form-data; boundary=" + boundary)
      .POST(HttpRequest.BodyPublishers.ofByteArray(body))
      .build();
    HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    requireOk(response.statusCode(), response.body(), "OpenAI transcription failed");
    Object text = Json.parseObject(response.body()).get("text");
    return text instanceof String value ? value : "";
  }

  String synthesizeJapanese(String text) throws IOException, InterruptedException {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("model", env("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"));
    payload.put("voice", env("OPENAI_TTS_VOICE", "coral"));
    payload.put("input", text);
    payload.put("instructions", "Speak natural, friendly Japanese for a language learner. Keep the pace clear but not robotic.");
    payload.put("response_format", "mp3");

    HttpRequest request = HttpRequest.newBuilder(URI.create(OPENAI_BASE_URL + "/audio/speech"))
      .timeout(Duration.ofSeconds(90))
      .header("Authorization", "Bearer " + apiKey())
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(Json.stringify(payload), StandardCharsets.UTF_8))
      .build();
    HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      String detail = new String(response.body(), StandardCharsets.UTF_8);
      throw new IllegalStateException("OpenAI speech failed: " + response.statusCode() + " " + detail);
    }
    return Base64.getEncoder().encodeToString(response.body());
  }

  private String extractResponseText(Map<String, Object> data) {
    Object outputText = data.get("output_text");
    if (outputText instanceof String text && !text.isBlank()) return text;

    Object output = data.get("output");
    if (!(output instanceof List<?> items)) return "";
    for (Object item : items) {
      if (!(item instanceof Map<?, ?> map)) continue;
      Object content = map.get("content");
      if (!(content instanceof List<?> contentItems)) continue;
      for (Object contentItem : contentItems) {
        if (!(contentItem instanceof Map<?, ?> contentMap)) continue;
        Object text = contentMap.get("text");
        if (text instanceof String value && !value.isBlank()) return value;
      }
    }
    return "";
  }

  static String env(String name, String fallback) {
    String value = System.getenv(name);
    return value == null || value.isBlank() ? fallback : value.trim();
  }

  static String urlEncode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private String apiKey() {
    String key = env("OPENAI_API_KEY", "");
    if (key.isBlank()) throw new IllegalStateException("OPENAI_API_KEY is not configured.");
    return key;
  }

  private static void requireOk(int statusCode, String body, String message) {
    if (statusCode < 200 || statusCode >= 300) {
      throw new IllegalStateException(message + ": " + statusCode + " " + body);
    }
  }
}
