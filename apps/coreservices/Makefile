# Core services (Spring Boot API). Run from apps/coreservices, or `make -C apps/coreservices <target>`.

# Local image (matches the commented-out core-services service in the root docker-compose.yaml).
LOCAL_IMAGE := sdewa/hub-coreservices:local
# Deploy image pulled by the EC2 instance (infra/terraform/variables.tf docker_image).
DEP_IMAGE   ?= sdewa/core-service-dep
TAG         ?= latest
GIT_SHA     := $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)
PLATFORM    ?= linux/arm64
PORT        ?= 8080
PROFILE     ?= local
# The container can't reach the host's localhost, so point the DB at host.docker.internal.
DOCKER_DB_URL ?= $(subst localhost,host.docker.internal,$(shell grep -E '^DB_URL=' .env 2>/dev/null | cut -d= -f2-))

.PHONY: run build test clean docker-build docker-run docker-dep-build docker-dep-push

## --- Gradle ---

# Defaults to the `local` profile (Swagger UI, dev tokens, fake integrations); override with PROFILE=...
run:
	SPRING_PROFILES_ACTIVE=$(PROFILE) ./gradlew bootRun

build:
	./gradlew bootJar -x test

test:
	./gradlew test

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

## --- Docker (deploy) --- used by the root Makefile's `deploy` target

docker-dep-build:
	docker buildx build --platform $(PLATFORM) \
		-t $(DEP_IMAGE):$(TAG) \
		-t $(DEP_IMAGE):$(GIT_SHA) \
		--load .

docker-dep-push:
	docker push $(DEP_IMAGE):$(TAG)
	docker push $(DEP_IMAGE):$(GIT_SHA)
