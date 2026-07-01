FROM gradle:8-jdk17 AS builder
WORKDIR /app
COPY settings.gradle build.gradle ./
COPY src src
RUN gradle bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
