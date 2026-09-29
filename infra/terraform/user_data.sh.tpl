#!/bin/bash
# First-boot setup of the hub API host (ADR-007 I7). Installs Docker, Compose, the ECR credential
# helper, and a swap file, writes /opt/hub/hub.env, then installs the deploy files from S3 through
# sync-infra.sh. It does not start the API: run the backend workflow after `terraform apply` (B9).
# No secrets here: deploy.sh reads them from SSM at every deploy.
set -euxo pipefail

dnf install -y docker jq amazon-ecr-credential-helper
systemctl enable --now docker

# 2 GB swap: two JVMs overlap for a few seconds during blue/green (ADR-007 B2).
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
swapon /swapfile || true

mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL --retry 5 --retry-delay 5 --retry-connrefused \
  "https://github.com/docker/compose/releases/download/${docker_compose_version}/docker-compose-linux-aarch64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version

# Pull from ECR with the instance role; no docker login and no token on disk (ADR-007 §6.3).
mkdir -p /root/.docker
cat > /root/.docker/config.json <<JSON
{ "credHelpers": { "${ecr_registry}": "ecr-login" } }
JSON

install -d -m 0755 /opt/hub /opt/hub/bin /opt/hub/nginx /opt/hub/secrets
cat > /opt/hub/hub.env <<ENV
AWS_REGION=${aws_region}
ECR_REPOSITORY_URI=${ecr_repository_url}
OPS_BUCKET=${ops_bucket}
SSM_PREFIX=${ssm_prefix}
ENV
chmod 600 /opt/hub/hub.env

aws s3 cp --region "${aws_region}" "s3://${ops_bucket}/infra/sync-infra.sh" /opt/hub/bin/sync-infra.sh
chmod 700 /opt/hub/bin/sync-infra.sh
/opt/hub/bin/sync-infra.sh
