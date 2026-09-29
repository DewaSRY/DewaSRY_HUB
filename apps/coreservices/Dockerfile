# syntax=docker/dockerfile:1.7
# Multi-stage build of the hub API for linux/arm64 (AWS Graviton, ADR-001 §5.3/§5.4).
#   docker buildx build --platform linux/arm64 -t dewa-hub/coreservices:latest apps/coreservices
#
# Images: scrimage-webp ships a static-pie cwebp/dwebp for linux-aarch64 (checked with `file`),
# so the runtime image does not need the distro `webp` package. It extracts the binary into
# java.io.tmpdir, which therefore must be writable and not mounted noexec.
#
# The build stage runs on the build machine's own platform ($BUILDPLATFORM): the jar is the same on
# every CPU, so an x86 CI runner only emulates the small runtime stage (ADR-007 §6.2).

ARG JAVA_VERSION=21

FROM --platform=$BUILDPLATFORM eclipse-temurin:${JAVA_VERSION}-jdk-noble AS build
WORKDIR /workspace
# Dependencies first, for layer caching.
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon -q dependencies > /dev/null
COPY src src
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon bootJar -x test \
 && java -Djarmode=tools -jar build/libs/app.jar extract --layers --launcher --destination /workspace/extracted

FROM --platform=linux/arm64 eclipse-temurin:${JAVA_VERSION}-jre-noble
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 10001 hub \
 && useradd --system --uid 10001 --gid hub --home /app --shell /usr/sbin/nologin hub
WORKDIR /app
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
RUN mkdir -p /app/tmp /app/media && chown -R hub:hub /app
USER hub
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+ExitOnOutOfMemoryError -Djava.io.tmpdir=/app/tmp -Djava.awt.headless=true"
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=5 \
  CMD curl -fsS "http://localhost:${PORT:-8080}/actuator/health/readiness" || exit 1
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
