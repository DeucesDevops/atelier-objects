FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S app -G app
COPY --from=build --chown=app:app /app/target/payment-service-1.0.0.jar app.jar

USER app
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "app.jar"]
