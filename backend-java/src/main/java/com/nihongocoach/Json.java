package com.nihongocoach;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class Json {
  private Json() {}

  @SuppressWarnings("unchecked")
  static Map<String, Object> parseObject(String json) {
    Object value = new Parser(json).parse();
    if (value instanceof Map<?, ?> map) {
      return (Map<String, Object>) map;
    }
    throw new IllegalArgumentException("JSON root is not an object.");
  }

  @SuppressWarnings("unchecked")
  static List<Object> parseArray(String json) {
    Object value = new Parser(json).parse();
    if (value instanceof List<?> list) {
      return (List<Object>) list;
    }
    throw new IllegalArgumentException("JSON root is not an array.");
  }

  static String stringify(Object value) {
    StringBuilder builder = new StringBuilder();
    writeValue(builder, value);
    return builder.toString();
  }

  @SuppressWarnings("unchecked")
  private static void writeValue(StringBuilder builder, Object value) {
    if (value == null) {
      builder.append("null");
    } else if (value instanceof String text) {
      writeString(builder, text);
    } else if (value instanceof Number || value instanceof Boolean) {
      builder.append(value);
    } else if (value instanceof Map<?, ?> map) {
      builder.append('{');
      boolean first = true;
      for (Map.Entry<?, ?> entry : map.entrySet()) {
        if (!first) builder.append(',');
        writeString(builder, String.valueOf(entry.getKey()));
        builder.append(':');
        writeValue(builder, entry.getValue());
        first = false;
      }
      builder.append('}');
    } else if (value instanceof Iterable<?> iterable) {
      builder.append('[');
      boolean first = true;
      for (Object item : iterable) {
        if (!first) builder.append(',');
        writeValue(builder, item);
        first = false;
      }
      builder.append(']');
    } else if (value.getClass().isArray()) {
      builder.append('[');
      Object[] items = (Object[]) value;
      for (int index = 0; index < items.length; index++) {
        if (index > 0) builder.append(',');
        writeValue(builder, items[index]);
      }
      builder.append(']');
    } else {
      writeString(builder, String.valueOf(value));
    }
  }

  private static void writeString(StringBuilder builder, String text) {
    builder.append('"');
    for (int index = 0; index < text.length(); index++) {
      char ch = text.charAt(index);
      switch (ch) {
        case '"' -> builder.append("\\\"");
        case '\\' -> builder.append("\\\\");
        case '\b' -> builder.append("\\b");
        case '\f' -> builder.append("\\f");
        case '\n' -> builder.append("\\n");
        case '\r' -> builder.append("\\r");
        case '\t' -> builder.append("\\t");
        default -> {
          if (ch < 0x20) {
            builder.append(String.format("\\u%04x", (int) ch));
          } else {
            builder.append(ch);
          }
        }
      }
    }
    builder.append('"');
  }

  private static final class Parser {
    private final String json;
    private int index;

    Parser(String json) {
      this.json = json == null ? "" : json;
    }

    Object parse() {
      skipWhitespace();
      Object value = readValue();
      skipWhitespace();
      if (index != json.length()) {
        throw new IllegalArgumentException("Unexpected JSON trailing content at " + index);
      }
      return value;
    }

    private Object readValue() {
      skipWhitespace();
      if (index >= json.length()) throw new IllegalArgumentException("Unexpected JSON end.");
      char ch = json.charAt(index);
      return switch (ch) {
        case '{' -> readObject();
        case '[' -> readArray();
        case '"' -> readString();
        case 't' -> readLiteral("true", Boolean.TRUE);
        case 'f' -> readLiteral("false", Boolean.FALSE);
        case 'n' -> readLiteral("null", null);
        default -> {
          if (ch == '-' || Character.isDigit(ch)) yield readNumber();
          throw new IllegalArgumentException("Unexpected JSON character '" + ch + "' at " + index);
        }
      };
    }

    private Map<String, Object> readObject() {
      Map<String, Object> object = new LinkedHashMap<>();
      expect('{');
      skipWhitespace();
      if (peek('}')) {
        index++;
        return object;
      }
      while (true) {
        String key = readString();
        skipWhitespace();
        expect(':');
        object.put(key, readValue());
        skipWhitespace();
        if (peek('}')) {
          index++;
          return object;
        }
        expect(',');
        skipWhitespace();
      }
    }

    private List<Object> readArray() {
      List<Object> array = new ArrayList<>();
      expect('[');
      skipWhitespace();
      if (peek(']')) {
        index++;
        return array;
      }
      while (true) {
        array.add(readValue());
        skipWhitespace();
        if (peek(']')) {
          index++;
          return array;
        }
        expect(',');
      }
    }

    private String readString() {
      expect('"');
      StringBuilder builder = new StringBuilder();
      while (index < json.length()) {
        char ch = json.charAt(index++);
        if (ch == '"') return builder.toString();
        if (ch == '\\') {
          if (index >= json.length()) throw new IllegalArgumentException("Invalid JSON escape.");
          char escaped = json.charAt(index++);
          switch (escaped) {
            case '"' -> builder.append('"');
            case '\\' -> builder.append('\\');
            case '/' -> builder.append('/');
            case 'b' -> builder.append('\b');
            case 'f' -> builder.append('\f');
            case 'n' -> builder.append('\n');
            case 'r' -> builder.append('\r');
            case 't' -> builder.append('\t');
            case 'u' -> {
              if (index + 4 > json.length()) throw new IllegalArgumentException("Invalid unicode escape.");
              int code = Integer.parseInt(json.substring(index, index + 4), 16);
              builder.append((char) code);
              index += 4;
            }
            default -> throw new IllegalArgumentException("Unknown JSON escape: " + escaped);
          }
        } else {
          builder.append(ch);
        }
      }
      throw new IllegalArgumentException("Unterminated JSON string.");
    }

    private Object readLiteral(String literal, Object value) {
      if (!json.startsWith(literal, index)) {
        throw new IllegalArgumentException("Expected " + literal + " at " + index);
      }
      index += literal.length();
      return value;
    }

    private Number readNumber() {
      int start = index;
      if (peek('-')) index++;
      while (index < json.length() && Character.isDigit(json.charAt(index))) index++;
      if (peek('.')) {
        index++;
        while (index < json.length() && Character.isDigit(json.charAt(index))) index++;
      }
      if (peek('e') || peek('E')) {
        index++;
        if (peek('+') || peek('-')) index++;
        while (index < json.length() && Character.isDigit(json.charAt(index))) index++;
      }
      String number = json.substring(start, index);
      if (number.contains(".") || number.contains("e") || number.contains("E")) {
        return Double.parseDouble(number);
      }
      try {
        return Integer.parseInt(number);
      } catch (NumberFormatException ignored) {
        return Long.parseLong(number);
      }
    }

    private void expect(char expected) {
      if (index >= json.length() || json.charAt(index) != expected) {
        throw new IllegalArgumentException("Expected '" + expected + "' at " + index);
      }
      index++;
    }

    private boolean peek(char expected) {
      return index < json.length() && json.charAt(index) == expected;
    }

    private void skipWhitespace() {
      while (index < json.length() && Character.isWhitespace(json.charAt(index))) index++;
    }
  }
}
