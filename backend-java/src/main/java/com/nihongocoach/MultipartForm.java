package com.nihongocoach;

import com.sun.net.httpserver.HttpExchange;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

final class MultipartForm {
  final Map<String, String> fields = new HashMap<>();
  final Map<String, FilePart> files = new HashMap<>();

  record FilePart(String fieldName, String fileName, String contentType, byte[] bytes) {}

  static MultipartForm parse(HttpExchange exchange) throws IOException {
    String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
    if (contentType == null || !contentType.toLowerCase(Locale.ROOT).contains("multipart/form-data")) {
      throw new IllegalArgumentException("Expected multipart/form-data request.");
    }
    String boundary = Arrays.stream(contentType.split(";"))
      .map(String::trim)
      .filter(part -> part.startsWith("boundary="))
      .map(part -> part.substring("boundary=".length()))
      .findFirst()
      .orElseThrow(() -> new IllegalArgumentException("Missing multipart boundary."));
    if (boundary.startsWith("\"") && boundary.endsWith("\"")) {
      boundary = boundary.substring(1, boundary.length() - 1);
    }

    byte[] body = exchange.getRequestBody().readAllBytes();
    MultipartForm form = new MultipartForm();
    byte[] marker = ("--" + boundary).getBytes(StandardCharsets.ISO_8859_1);
    int position = 0;

    while (true) {
      int boundaryStart = indexOf(body, marker, position);
      if (boundaryStart < 0) break;
      int partStart = boundaryStart + marker.length;
      if (partStart + 1 < body.length && body[partStart] == '-' && body[partStart + 1] == '-') break;
      if (partStart + 1 < body.length && body[partStart] == '\r' && body[partStart + 1] == '\n') {
        partStart += 2;
      }

      int nextBoundary = indexOf(body, marker, partStart);
      if (nextBoundary < 0) break;
      int partEnd = nextBoundary;
      if (partEnd >= 2 && body[partEnd - 2] == '\r' && body[partEnd - 1] == '\n') {
        partEnd -= 2;
      }

      int headersEnd = indexOf(body, "\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1), partStart);
      if (headersEnd > partStart && headersEnd < partEnd) {
        String headersText = new String(body, partStart, headersEnd - partStart, StandardCharsets.ISO_8859_1);
        int dataStart = headersEnd + 4;
        byte[] data = Arrays.copyOfRange(body, dataStart, partEnd);
        PartHeaders headers = PartHeaders.parse(headersText);
        if (headers.name != null) {
          if (headers.fileName == null) {
            form.fields.put(headers.name, new String(data, StandardCharsets.UTF_8));
          } else {
            form.files.put(headers.name, new FilePart(
              headers.name,
              headers.fileName,
              headers.contentType == null ? "application/octet-stream" : headers.contentType,
              data
            ));
          }
        }
      }

      position = nextBoundary;
    }

    return form;
  }

  static byte[] build(Map<String, String> fields, FilePart file, String boundary) throws IOException {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    for (Map.Entry<String, String> entry : fields.entrySet()) {
      writeAscii(out, "--" + boundary + "\r\n");
      writeAscii(out, "Content-Disposition: form-data; name=\"" + entry.getKey() + "\"\r\n\r\n");
      out.write(entry.getValue().getBytes(StandardCharsets.UTF_8));
      writeAscii(out, "\r\n");
    }
    if (file != null) {
      writeAscii(out, "--" + boundary + "\r\n");
      writeAscii(out, "Content-Disposition: form-data; name=\"" + file.fieldName + "\"; filename=\"" + file.fileName + "\"\r\n");
      writeAscii(out, "Content-Type: " + file.contentType + "\r\n\r\n");
      out.write(file.bytes);
      writeAscii(out, "\r\n");
    }
    writeAscii(out, "--" + boundary + "--\r\n");
    return out.toByteArray();
  }

  private static void writeAscii(ByteArrayOutputStream out, String text) throws IOException {
    out.write(text.getBytes(StandardCharsets.ISO_8859_1));
  }

  private static int indexOf(byte[] source, byte[] target, int from) {
    outer:
    for (int index = Math.max(0, from); index <= source.length - target.length; index++) {
      for (int offset = 0; offset < target.length; offset++) {
        if (source[index + offset] != target[offset]) continue outer;
      }
      return index;
    }
    return -1;
  }

  private static final class PartHeaders {
    String name;
    String fileName;
    String contentType;

    static PartHeaders parse(String text) {
      PartHeaders headers = new PartHeaders();
      for (String line : text.split("\r\n")) {
        int separator = line.indexOf(':');
        if (separator < 0) continue;
        String key = line.substring(0, separator).trim().toLowerCase(Locale.ROOT);
        String value = line.substring(separator + 1).trim();
        if (key.equals("content-type")) {
          headers.contentType = value;
        }
        if (key.equals("content-disposition")) {
          for (String segment : value.split(";")) {
            String trimmed = segment.trim();
            int equals = trimmed.indexOf('=');
            if (equals < 0) continue;
            String itemKey = trimmed.substring(0, equals).trim();
            String itemValue = trimmed.substring(equals + 1).trim();
            if (itemValue.startsWith("\"") && itemValue.endsWith("\"")) {
              itemValue = itemValue.substring(1, itemValue.length() - 1);
            }
            if (itemKey.equals("name")) headers.name = itemValue;
            if (itemKey.equals("filename")) headers.fileName = itemValue;
          }
        }
      }
      return headers;
    }
  }
}
