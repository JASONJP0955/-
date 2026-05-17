package com.nihongocoach;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.Executors;

public final class BackendApplication {
  public static void main(String[] args) throws IOException {
    int port = Integer.parseInt(OpenAiClient.env("JAVA_BACKEND_PORT", "8080"));
    String host = OpenAiClient.env("JAVA_BACKEND_HOST", "127.0.0.1");
    OpenAiClient openAi = new OpenAiClient();
    SpeechClient speech = new SpeechClient(openAi);
    CoachService coach = new CoachService(openAi, speech);

    HttpServer server = HttpServer.create(new InetSocketAddress(host, port), 0);
    server.createContext("/api/status", exchange -> handle(exchange, "GET", ignored -> coach.status()));
    server.createContext("/api/session", exchange -> handle(exchange, "POST", ignored -> coach.startSession()));
    server.createContext("/api/respond", exchange -> handle(exchange, "POST", ignored -> coach.respond(MultipartForm.parse(exchange))));
    server.createContext("/api/feedback", exchange -> handle(exchange, "POST", ignored -> coach.feedback(MultipartForm.parse(exchange))));
    server.createContext("/api/tts", exchange -> handle(exchange, "POST", ignored -> {
      Map<String, Object> body = readJsonBody(exchange);
      Object text = body.get("text");
      if (!(text instanceof String value) || value.isBlank()) {
        throw new IllegalArgumentException("Missing text.");
      }
      return coach.tts(value.trim());
    }));
    server.createContext("/health", exchange -> handle(exchange, "GET", ignored -> map("ok", true)));
    server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
    server.start();
    System.out.println("Nihongo Java backend listening on http://" + host + ":" + port);
  }

  private static void handle(HttpExchange exchange, String method, Route route) throws IOException {
    addCors(exchange);
    if ("OPTIONS".equals(exchange.getRequestMethod())) {
      exchange.sendResponseHeaders(204, -1);
      return;
    }
    if (!method.equals(exchange.getRequestMethod())) {
      writeJson(exchange, 405, map("error", "Method not allowed."));
      return;
    }
    try {
      writeJson(exchange, 200, route.handle(exchange));
    } catch (Exception error) {
      error.printStackTrace();
      int status = error instanceof IllegalArgumentException ? 400 : 500;
      writeJson(exchange, status, map("error", error.getMessage() == null ? "Java backend failed." : error.getMessage()));
    } finally {
      exchange.close();
    }
  }

  private static Map<String, Object> readJsonBody(HttpExchange exchange) throws IOException {
    byte[] bytes = exchange.getRequestBody().readAllBytes();
    if (bytes.length == 0) return new LinkedHashMap<>();
    return Json.parseObject(new String(bytes, StandardCharsets.UTF_8));
  }

  private static void writeJson(HttpExchange exchange, int status, Map<String, Object> payload) throws IOException {
    byte[] bytes = Json.stringify(payload).getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
    exchange.sendResponseHeaders(status, bytes.length);
    exchange.getResponseBody().write(bytes);
  }

  private static void addCors(HttpExchange exchange) {
    exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
    exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }

  private static Map<String, Object> map(Object... pairs) {
    Map<String, Object> map = new LinkedHashMap<>();
    for (int index = 0; index + 1 < pairs.length; index += 2) {
      map.put(String.valueOf(pairs[index]), pairs[index + 1]);
    }
    return map;
  }

  @FunctionalInterface
  private interface Route {
    Map<String, Object> handle(HttpExchange exchange) throws Exception;
  }
}
