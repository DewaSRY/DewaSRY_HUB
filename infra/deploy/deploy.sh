#!/usr/bin/env bash
# Blue/green deploy of the hub API on the EC2 instance (ADR-007 §8.3).
#
#   /opt/hub/deploy.sh sha256:<64 hex> <40 hex git sha>
#
# Run as root by the hub-deploy SSM document (CI), or by hand from a Session Manager shell for an
# emergency rollback (ADR-007 §10). Installed by sync-infra.sh; changes here need
# `terraform apply` + `make infra-sync` (see docs/DEPLOYMENT.md).
#
# Steps: lock → render config from SSM → pg_dump to S3 → start the idle color → wait for the
# Docker health check → switch the Nginx upstream → drain → stop the old color → record release.
# Any failure before the switch stops the new color and leaves the old one serving (B5).
set -euo pipefail
umask 077

HUB_DIR=${HUB_DIR:-/opt/hub}
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-180}
DRAIN_SECONDS=${DRAIN_SECONDS:-10}

# Written by user_data: AWS_REGION, ECR_REPOSITORY_URI, OPS_BUCKET, SSM_PREFIX, and optionally
# PG_DUMP_IMAGE / PREDEPLOY_BACKUP.
# shellcheck source=/dev/null
source "$HUB_DIR/hub.env"
PG_DUMP_IMAGE=${PG_DUMP_IMAGE:-postgres:17-alpine}
PREDEPLOY_BACKUP=${PREDEPLOY_BACKUP:-true}

# SSM Run Command starts with a minimal environment.
export HOME=/root DOCKER_CONFIG=/root/.docker AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"

# Keys that application-prod.yaml needs and that have no default there (§8.4).
REQUIRED_KEYS=(
  DB_URL DB_USERNAME DB_PASSWORD
  HUB_SITE_BASE_URL HUB_CORS_ALLOWED_ORIGINS FIREBASE_PROJECT_ID
  MIDTRANS_SERVER_KEY HUB_STORAGE_PUBLIC_BASE_URL HUB_S3_BUCKET
  HUB_REVALIDATE_URL HUB_REVALIDATE_SECRET
)

log() { printf '[deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { log "ERROR: $*"; exit 1; }

digest=${1:-}
revision=${2:-}
[[ $digest =~ ^sha256:[0-9a-f]{64}$ ]] || die "usage: deploy.sh sha256:<digest> <git sha>"
[[ $revision =~ ^[0-9a-f]{40}$ ]] || die "revision must be a full 40-character git sha"

exec 9>"$HUB_DIR/deploy.lock"
flock -w 300 9 || die "another deploy is still running"

log "deploy-script-sha256=$(sha256sum "${BASH_SOURCE[0]}" | cut -d' ' -f1)"
log "revision=$revision digest=$digest"

image="$ECR_REPOSITORY_URI@$digest"

ACTIVE='' BLUE_IMAGE='' GREEN_IMAGE='' BLUE_REVISION='' GREEN_REVISION=''
if [[ -f $HUB_DIR/release.env ]]; then
  # shellcheck source=/dev/null
  source "$HUB_DIR/release.env"
fi
case $ACTIVE in
  blue) old=blue new=green ;;
  green) old=green new=blue ;;
  '') old='' new=blue ;;
  *) die "release.env has ACTIVE=$ACTIVE" ;;
esac
log "active=${old:-none} → deploying to $new"

# Compose needs both image names to parse the file; the color that has never run borrows the new one.
if [[ $new == blue ]]; then
  compose_blue=$image compose_green=${GREEN_IMAGE:-$image}
else
  compose_blue=${BLUE_IMAGE:-$image} compose_green=$image
fi
compose() {
  BLUE_IMAGE=$compose_blue GREEN_IMAGE=$compose_green \
    docker compose --project-directory "$HUB_DIR" -f "$HUB_DIR/docker-compose.yml" "$@"
}
container_id() { compose ps -q -a "$1" 2>/dev/null || true; }

upstream=$HUB_DIR/nginx/hub/upstream.conf
previous_upstream=''
[[ -f $upstream ]] && previous_upstream=$(<"$upstream")
phase=prepare
tmp=$(mktemp -d)

cleanup() {
  local status=$?
  if [[ $status -ne 0 && $phase == started ]]; then
    log "deploy failed; stopping api-$new. ${old:+api-$old is still serving.}"
    local cid
    cid=$(container_id "api-$new")
    [[ -n $cid ]] && docker logs --tail 200 "$cid" 2>&1 | sed 's/^/[api-'"$new"'] /' || true
    compose stop -t 10 "api-$new" || true
    if [[ $(cat "$upstream" 2>/dev/null) != "$previous_upstream" ]]; then
      if [[ -n $previous_upstream ]]; then
        printf '%s\n' "$previous_upstream" >"$upstream"
      else
        rm -f "$upstream"
      fi
    fi
  fi
  rm -rf "$tmp"
  exit "$status"
}
trap cleanup EXIT

# ---- 1. Runtime config from SSM Parameter Store (§8.4) ----------------------------------------
log "reading ${SSM_PREFIX}* from SSM"
aws ssm get-parameters-by-path --path "$SSM_PREFIX" --recursive --with-decryption \
  --output json >"$tmp/params.json"

param() { jq -r --arg n "$SSM_PREFIX$1" '.Parameters[] | select(.Name == $n) | .Value' "$tmp/params.json"; }

if jq -e --arg p "${SSM_PREFIX}files/" \
  'any(.Parameters[]; (.Name | startswith($p) | not) and (.Value | test("\n")))' "$tmp/params.json" >/dev/null; then
  die "an SSM value outside files/ contains a newline; app.env cannot hold it"
fi
jq -r --arg p "$SSM_PREFIX" '
  .Parameters[]
  | (.Name | ltrimstr($p)) as $k
  | select($k | test("^[A-Z_][A-Z0-9_]*$"))
  | "\($k)=\(.Value)"' "$tmp/params.json" >"$tmp/app.env"

missing=()
for key in "${REQUIRED_KEYS[@]}"; do
  grep -q "^$key=." "$tmp/app.env" || missing+=("$key")
done
[[ ${#missing[@]} -eq 0 ]] || die "missing SSM parameters under $SSM_PREFIX: ${missing[*]}"

origin_pem=$(param files/origin.pem)
origin_key=$(param files/origin.key)
[[ -n $origin_pem && -n $origin_key ]] || die "missing ${SSM_PREFIX}files/origin.pem or files/origin.key"
firebase_json=$(param files/firebase-service-account.json)

install -d -m 0700 -o 10001 -g 10001 "$HUB_DIR/secrets/$new"
if [[ -n $firebase_json ]]; then
  printf '%s\n' "$firebase_json" >"$tmp/firebase.json"
  install -m 0400 -o 10001 -g 10001 "$tmp/firebase.json" "$HUB_DIR/secrets/$new/firebase.json"
  echo "FIREBASE_SERVICE_ACCOUNT_PATH=/run/secrets/firebase.json" >>"$tmp/app.env"
else
  log "WARNING: no ${SSM_PREFIX}files/firebase-service-account.json; SSO custom tokens will fail"
fi
install -m 0600 "$tmp/app.env" "$HUB_DIR/app.$new.env"

install -d -m 0755 "$HUB_DIR/tls"
printf '%s\n' "$origin_pem" >"$tmp/origin.pem"
printf '%s\n' "$origin_key" >"$tmp/origin.key"
install -m 0644 "$tmp/origin.pem" "$HUB_DIR/tls/origin.pem"
install -m 0600 "$tmp/origin.key" "$HUB_DIR/tls/origin.key"
log "rendered app.$new.env ($(wc -l <"$tmp/app.env") keys), TLS files"

# ---- 2. Pre-deploy database dump (§9 M5) --------------------------------------------------------
if [[ $PREDEPLOY_BACKUP == true ]]; then
  db_url=$(grep '^DB_URL=' "$tmp/app.env" | cut -d= -f2-)
  db_user=$(grep '^DB_USERNAME=' "$tmp/app.env" | cut -d= -f2-)
  db_password=$(grep '^DB_PASSWORD=' "$tmp/app.env" | cut -d= -f2-)
  dump="s3://$OPS_BUCKET/pre-deploy/$revision.dump"
  log "pg_dump (schema public) → $dump"
  # jdbc:postgresql://host:port/db?sslmode=require → postgresql://host:port/db?sslmode=require
  PGUSER=$db_user PGPASSWORD=$db_password docker run --rm -e PGUSER -e PGPASSWORD "$PG_DUMP_IMAGE" \
    pg_dump --format=custom --no-owner --schema=public --dbname="${db_url#jdbc:}" |
    aws s3 cp - "$dump" --only-show-errors
else
  log "WARNING: PREDEPLOY_BACKUP=$PREDEPLOY_BACKUP in hub.env; skipping pg_dump"
fi

# ---- 3. Start the idle color and wait for its health check (B1) --------------------------------
log "pulling $image"
docker pull --quiet "$image" >/dev/null
phase=started
compose up -d --no-deps --force-recreate "api-$new"
cid=$(container_id "api-$new")
[[ -n $cid ]] || die "api-$new did not start"

log "waiting up to ${HEALTH_TIMEOUT}s for api-$new to become healthy"
deadline=$((SECONDS + HEALTH_TIMEOUT))
while :; do
  state=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$cid")
  case $state in
    'running healthy') break ;;
    running*) ;;
    *) die "api-$new stopped ($state); OOM-killed or failed to start (Flyway, config)" ;;
  esac
  ((SECONDS < deadline)) || die "api-$new not healthy after ${HEALTH_TIMEOUT}s ($state)"
  sleep 5
done
log "api-$new is healthy"

# ---- 4. Switch the Nginx upstream (B3, B4) ------------------------------------------------------
printf 'server api-%s:8080;\n' "$new" >"$upstream.tmp"
chmod 0644 "$upstream.tmp"
mv "$upstream.tmp" "$upstream"
if [[ -n $(compose ps -q --status running nginx) ]]; then
  compose exec -T nginx nginx -t -q || die "nginx -t failed; upstream restored"
  compose exec -T nginx nginx -s reload
  log "nginx reloaded → api-$new"
else
  compose up -d --no-deps nginx
  sleep 3
  [[ -n $(compose ps -q --status running nginx) ]] || {
    docker logs --tail 50 "$(container_id nginx)" 2>&1 || true
    die "nginx did not start"
  }
  log "nginx started → api-$new"
fi
phase=switched

# ---- 5. Drain and stop the old color (B4, B7) ---------------------------------------------------
if [[ -n $old && -n $(container_id "api-$old") ]]; then
  log "draining ${DRAIN_SECONDS}s, then stopping api-$old"
  sleep "$DRAIN_SECONDS"
  compose stop -t 30 "api-$old" || log "WARNING: could not stop api-$old"
fi

if [[ $new == blue ]]; then
  BLUE_IMAGE=$image BLUE_REVISION=$revision
else
  GREEN_IMAGE=$image GREEN_REVISION=$revision
fi
cat >"$HUB_DIR/release.env.tmp" <<EOF
ACTIVE=$new
BLUE_IMAGE=$BLUE_IMAGE
BLUE_REVISION=$BLUE_REVISION
GREEN_IMAGE=$GREEN_IMAGE
GREEN_REVISION=$GREEN_REVISION
EOF
mv "$HUB_DIR/release.env.tmp" "$HUB_DIR/release.env"

# Keeps every image a container still uses (both colors, nginx); removes the rest.
docker image prune -af >/dev/null || true
log "done: api-$new serves $revision"
