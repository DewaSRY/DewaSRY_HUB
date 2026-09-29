# Core services (Spring Boot API). Run from apps/coreservices, or `make -C apps/coreservices <target>`.

# Local image (matches the commented-out core-services service in the root docker-compose.yaml).
LOCAL_IMAGE := sdewa/hub-coreservices:local
PLATFORM    ?= linux/arm64
PORT        ?= 8080
PROFILE     ?= local
# The container can't reach the host's localhost, so point the DB at host.docker.internal.
DOCKER_DB_URL ?= $(subst localhost,host.docker.internal,$(shell grep -E '^DB_URL=' .env 2>/dev/null | cut -d= -f2-))

.PHONY: run build test contract-update clean docker-build docker-run

## --- Gradle ---

# Defaults to the `local` profile (Swagger UI, dev tokens, fake integrations); override with PROFILE=...
run:
	SPRING_PROFILES_ACTIVE=$(PROFILE) ./gradlew bootRun

build:
	./gradlew bootJar -x test

test:
	./gradlew test

# Regenerates contracts/openapi/v1.json after an intended API change (ADR-007 §5.1). Review the diff.
contract-update:
	-./gradlew test --tests '*OpenApiContractTest' -q
	@if [ -f build/contracts/openapi/v1.json ]; then \
		cp build/contracts/openapi/v1.json ../../contracts/openapi/v1.json && rm -rf build/contracts && \
		echo "Updated contracts/openapi/v1.json; review it with git diff."; \
	else echo "contracts/openapi/v1.json is already up to date."; fi

clean:
	./gradlew clean

## --- Docker (local) ---

docker-build:
	docker buildx build --platform $(PLATFORM) -t $(LOCAL_IMAGE) --load .

# Runs the local image with .env, on the `local` profile (fake Midtrans, local storage).
docker-run:
	docker run --rm -it \
		-p $(PORT):8080 \
		--env-file .env \
		-e PORT=8080 \
		-e SPRING_PROFILES_ACTIVE=local \
		$(if $(DOCKER_DB_URL),-e DB_URL=$(DOCKER_DB_URL)) \
		$(LOCAL_IMAGE)

# Production images are built by CI only (.github/workflows/backend.yml, ADR-007 D8).
