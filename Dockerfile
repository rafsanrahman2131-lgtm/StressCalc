# Stage 1: Build the Spring Boot application using Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src src
RUN mvn clean package -DskipTests

# Stage 2: Create runtime environment with Java 17
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/StressCalculator-1.0.0-SNAPSHOT.jar app.jar

# Expose port 8080
EXPOSE 8080

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]
