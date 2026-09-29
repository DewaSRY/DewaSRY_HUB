#!/usr/bin/env bash
# Installs the instance-side deploy files from s3://$OPS_BUCKET/infra/ into /opt/hub (ADR-007 I7).
# Terraform uploads them (infra/terraform/deploy_files.tf) from infra/deploy and apps/nginx.
#
# Runs once from user_data on first boot, and again whenever `make infra-sync` sends it through
# SSM Run Command after a `terraform apply` that changed deploy.sh, the compose file, or Nginx.
# It never starts or stops the API; it only reloads Nginx if Nginx is already running.
set -euo pipefail

HUB_DIR=${HUB_DIR:-/opt/hub}
# shellcheck source=/dev/null
source "$HUB_DIR/hub.env"
export HOME=/root DOCKER_CONFIG=/root/.docker AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"

log() { printf '[sync-infra %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }

# Same lock as deploy.sh, so files never change in the middle of a deploy.
exec 9>"$HUB_DIR/deploy.lock"
flock -w 300 9 || { log "ERROR: a deploy is still running"; exit 1; }

src="s3://$OPS_BUCKET/infra"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

aws s3 cp --only-show-errors "$src/deploy.sh" "$tmp/deploy.sh"
aws s3 cp --only-show-errors "$src/sync-infra.sh" "$tmp/sync-infra.sh"
aws s3 cp --only-show-errors "$src/docker-compose.yml" "$tmp/docker-compose.yml"
install -m 0700 "$tmp/deploy.sh" "$HUB_DIR/deploy.sh"
install -m 0700 "$tmp/sync-infra.sh" "$HUB_DIR/bin/sync-infra.sh"
install -m 0644 "$tmp/docker-compose.yml" "$HUB_DIR/docker-compose.yml"

install -d -m 0755 "$HUB_DIR/nginx/conf.d" "$HUB_DIR/nginx/hub"
aws s3 sync --only-show-errors --delete "$src/nginx/conf.d/" "$HUB_DIR/nginx/conf.d/"
# upstream.conf is runtime state owned by deploy.sh.
aws s3 sync --only-show-errors --delete --exclude upstream.conf "$src/nginx/hub/" "$HUB_DIR/nginx/hub/"
chmod -R a+rX "$HUB_DIR/nginx"

log "deploy-script-sha256=$(sha256sum "$HUB_DIR/deploy.sh" | cut -d' ' -f1)"

cd "$HUB_DIR"
if [[ -f release.env ]] && [[ -n $(docker ps -q --filter label=com.docker.compose.project=hub --filter label=com.docker.compose.service=nginx) ]]; then
  # shellcheck source=/dev/null
  source release.env
  # Compose needs both names to parse the file, even for the color that has never run.
  : "${BLUE_IMAGE:=$GREEN_IMAGE}" "${GREEN_IMAGE:=$BLUE_IMAGE}"
  export BLUE_IMAGE GREEN_IMAGE
  docker compose exec -T nginx nginx -t -q
  docker compose exec -T nginx nginx -s reload
  log "nginx reloaded"
else
  log "nginx is not running yet; the first deploy starts it"
fi
log "done"
