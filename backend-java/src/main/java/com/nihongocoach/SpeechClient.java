package com.nihongocoach;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class SpeechClient {
  private final OpenAiClient openAi;
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();

  SpeechClient(OpenAiClient openAi) {
    this.openAi = openAi;
  }

  String provider() {
    return OpenAiClient.env("STT_PROVIDER", "openai").equalsIgnoreCase("google") ? "google" : "openai";
  }

  boolean googleConfigured() {
    return !OpenAiClient.env("GOOGLE_SPEECH_ACCESS_TOKEN", "").isBlank()
      || !OpenAiClient.env("GOOGLE_SPEECH_API_KEY", "").isBlank();
  }

  boolean speechConfigured() {
    return provider().equals("google") ? googleConfigured() : openAi.hasKey();
  }

  String sttModel() {
    return provider().equals("google")
      ? OpenAiClient.env("GOOGLE_SPEECH_MODEL", "latest_short")
      : OpenAiClient.env("OPENAI_STT_MODEL", "gpt-4o-transcribe");
  }

  String transcribeJapanese(MultipartForm.FilePart audio) throws IOException, InterruptedException {
    if (provider().equals("google")) return transcribeWithGoogle(audio);
    return openAi.transcribeJapanese(audio);
  }

  private String transcribeWithGoogle(MultipartForm.FilePart audio) throws IOException, InterruptedException {
    String accessToken = OpenAiClient.env("GOOGLE_SPEECH_ACCESS_TOKEN", "");
    String apiKey = OpenAiClient.env("GOOGLE_SPEECH_API_KEY", "");
    if (accessToken.isBlank() && apiKey.isBlank()) {
      throw new IllegalStateException("Google Speech-to-Text is selected, but no Google credential is configured.");
    }

    String url = "https://speech.googleapis.com/v1/speech:recognize";
    if (accessToken.isBlank() && !apiKey.isBlank()) {
      url += "?key=" + OpenAiClient.urlEncode(apiKey);
    }

    Map<String, Object> config = new LinkedHashMap<>();
    config.put("encoding", "WEBM_OPUS");
    config.put("sampleRateHertz", Integer.parseInt(OpenAiClient.env("GOOGLE_SPEECH_SAMPLE_RATE", "48000")));
    config.put("languageCode", "ja-JP");
    config.put("model", OpenAiClient.env("GOOGLE_SPEECH_MODEL", "latest_short"));
    config.put("enableAutomaticPunctuation", true);
    config.put("useEnhanced", true);

    Map<String, Object> audioPayload = new LinkedHashMap<>();
    audioPayload.put("content", Base64.getEncoder().encodeToString(audio.bytes()));

    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("config", config);
    payload.put("audio", audioPayload);

    HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
      .timeout(Duration.ofSeconds(90))
      .header("Content-Type", "application/json");
    if (!accessToken.isBlank()) {
      builder.header("Authorization", "Bearer " + accessToken);
    }
    HttpResponse<String> response = http.send(
      builder.POST(HttpRequest.BodyPublishers.ofString(Json.stringify(payload), StandardCharsets.UTF_8)).build(),
      HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
    );
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new IllegalStateException("Google Speech-to-Text failed: " + response.statusCode() + " " + response.body());
    }

    Map<String, Object> data = Json.parseObject(response.body());
    Object results = data.get("results");
    if (!(results instanceof List<?> resultItems)) return "";
    return resultItems.stream()
      .filter(Map.class::isInstance)
      .map(Map.class::cast)
      .flatMap(result -> {
        Object alternatives = result.get("alternatives");
        return alternatives instanceof List<?> list ? list.stream() : List.of().stream();
      })
      .filter(Map.class::isInstance)
      .map(Map.class::cast)
      .max(Comparator.comparingDouble(item -> item.get("confidence") instanceof Number n ? n.doubleValue() : 0))
      .map(item -> item.get("transcript"))
      .filter(String.class::isInstance)
      .map(String.class::cast)
      .orElse("");
  }
}
