FROM eclipse-temurin:21-jdk AS build

WORKDIR /app
COPY src ./src
RUN mkdir -p out \
  && javac -encoding UTF-8 -d out $(find src/main/java -name "*.java") \
  && cp -R src/main/resources/. out/

FROM eclipse-temurin:21-jre

WORKDIR /app
ENV JAVA_BACKEND_HOST=0.0.0.0
ENV JAVA_BACKEND_PORT=8080
COPY --from=build /app/out ./out
EXPOSE 8080
CMD ["java", "-cp", "out", "com.nihongocoach.BackendApplication"]
