# Deployment and Development Runbook

How code gets from a branch to production, the one-time setup behind it, and the commands for
day-to-day work and incidents. The design and its reasons are in
[ADR-007](./ADR/ADR-007-ci_cd_pipeline.md). This file is the "how".

| Part           | Where it runs                                            | Deployed by                        |
| -------------- | -------------------------------------------------------- | ---------------------------------- |
| API            | Spring Boot arm64 image on EC2 `t4g.small`, behind Nginx | `.github/workflows/backend.yml`    |
| Portal         | Next.js on Cloudflare Workers (OpenNext)                 | `.github/workflows/portal.yml`     |
| Infrastructure | Terraform in `infra/terraform` (local state)             | You, with `make tf-apply`          |

---

## 1. How it works

```
feature branch ──PR──▶ main (protected)
   │                     │
   │ backend-test        │ backend: test ─▶ image (arm64, ECR sha-<sha>) ─▶ deploy
   │ portal-check        │ portal:  check ─▶ deploy (wrangler)
   │ infra-check         │ infra:   check (fmt, validate, shellcheck, nginx -t)
```

**Backend deploy, step by step**

1. `test` runs `./gradlew test` on a native arm64 runner. This includes the article fixtures, the
   OpenAPI contract, and a guard that rejects edits to applied migrations.
2. `image` builds `apps/coreservices/Dockerfile` for `linux/arm64` and pushes
   `hub/coreservices:sha-<git sha>` to ECR. Tags are immutable, and the job outputs the digest.
3. `deploy` signs in to AWS with OIDC (no stored keys) and runs the `hub-deploy` SSM document on
   the instance tagged `Role=hub-api`. The document can only run
   `/opt/hub/deploy.sh <digest> <sha>`.
4. `deploy.sh` does the blue/green switch on the instance:
   1. Reads `/hub/prod/*` from SSM and writes `app.<color>.env`, `firebase.json`, and the TLS files.
   2. Runs `pg_dump` and uploads it to `s3://<ops bucket>/pre-deploy/<sha>.dump`.
   3. Starts the idle color and waits for its Docker health check (`/actuator/health/readiness`).
   4. Switches the Nginx upstream, reloads Nginx, drains for 10 s, then stops the old color.
   5. If any step fails **before the switch**, it stops the new color and the old one keeps serving.
5. The job smoke-tests `GET https://api.dewasuryahub.com/v1/public/products` through Cloudflare.

**Files on the instance** (`/opt/hub`)

| File                                     | What it is                                                            |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `deploy.sh`, `bin/sync-infra.sh`         | From `infra/deploy/`, installed by `sync-infra.sh`                    |
| `docker-compose.yml`                     | From `infra/deploy/docker-compose.prod.yaml`: `api-blue`, `api-green`, `nginx` |
| `nginx/conf.d/*`, `nginx/hub/routes.conf` | From `apps/nginx/` (shared with local compose) plus the Cloudflare real-IP list |
| `nginx/hub/upstream.conf`                | `server api-<color>:8080;`, written by `deploy.sh`                    |
| `release.env`                            | `ACTIVE`, and `BLUE_IMAGE`/`GREEN_IMAGE` with their revisions         |
| `app.<color>.env`, `secrets/<color>/`, `tls/` | Rendered from SSM at each deploy (never in git or Terraform)     |
| `hub.env`                                | Region, ECR URI, ops bucket, SSM prefix (written by `user_data`)      |

Terraform uploads the deploy files to `s3://<ops bucket>/infra/`. The instance installs them with
`sync-infra.sh`: once at first boot, and again whenever you run `make infra-sync`.

---

## 2. One-time setup

Do these in order. Steps 2.3 and 2.6 **replace the current x86 instance**. That is expected: the
old instance cannot run the arm64 image, and nothing is live yet.

### 2.1 Tools on your laptop

```bash
brew install awscli terraform gh jq
brew install --cask session-manager-plugin   # for `make ssm-shell`
aws configure                                 # an admin profile, for Terraform and SSM writes
gh auth login
```

### 2.2 Runtime parameters in SSM

`deploy.sh` reads everything under `/hub/prod/` at each deploy. Values never go into Terraform.
Each name becomes one `KEY=VALUE` line in `app.<color>.env`, except the `files/*` names.

```bash
R=ap-southeast-1
put()  { aws ssm put-parameter --region $R --overwrite --name "/hub/prod/$1" --type String       --value "$2"; }
sput() { aws ssm put-parameter --region $R --overwrite --name "/hub/prod/$1" --type SecureString --value "$2"; }

# Database (Supabase). Use the session pooler or direct host on port 5432: pg_dump does not work
# through the transaction pooler (6543).
put  DB_URL       'jdbc:postgresql://<host>:5432/postgres?sslmode=require'
put  DB_USERNAME  'postgres.<project-ref>'
sput DB_PASSWORD  '<password>'

# Required by application-prod.yaml (deploy.sh refuses to start without them)
put  HUB_SITE_BASE_URL            'https://dewasuryahub.com'
put  HUB_CORS_ALLOWED_ORIGINS     'https://dewasuryahub.com'
put  FIREBASE_PROJECT_ID          '<firebase project id>'
sput MIDTRANS_SERVER_KEY          '<midtrans server key>'
put  HUB_STORAGE_PUBLIC_BASE_URL  'https://cdn.dewasuryahub.com'
put  HUB_S3_BUCKET                '<media bucket>'
put  HUB_REVALIDATE_URL           'https://dewasuryahub.com/api/revalidate'
sput HUB_REVALIDATE_SECRET        "$(openssl rand -hex 32)"   # same value as the portal's REVALIDATE_SECRET (2.8)

# Optional
put  HUB_BOOTSTRAP_ADMIN_UID  '<your firebase uid>'
put  MIDTRANS_SANDBOX         'true'        # until Midtrans production is approved
put  HUB_S3_REGION            'ap-southeast-1'
put  DD_CLIENT_ID             'dd_live_SEED0001'
sput DD_CLIENT_SECRET_HASH    '<argon2 hash>'

# Files (SecureString, read from disk)
sput files/firebase-service-account.json file://firebase-service-account.json
sput files/origin.pem                    file://origin.pem    # Cloudflare Origin CA cert (2.5)
sput files/origin.key                    file://origin.key
```

Check what is there (names only): `make ssm-list`.

### 2.3 Terraform

```bash
make tf-init
make tf-plan      # expect: replace instance (arm64 AMI), new SG/EIP/ECR/IAM/SSM doc/ops bucket,
                  #         destroy the SSH key pair and core-service-sg
make tf-apply
make tf-output
```

Notes:

- `infra/terraform/terraform.tfvars` still sets the old variables (`db_source`, `jwt_secret_key`,
  …). Terraform only warns about them, but delete them. Then delete `core-service-key.pem`.
- If the AWS account already has a GitHub OIDC provider, set `create_github_oidc_provider = false`.
- Set `media_bucket_name` once the article-image bucket exists, so the instance role can write to it.
- A new instance serves nothing until its first deploy (2.6).

Outputs you need next: `elastic_ip`, `github_deploy_role_arn`, `ecr_repository_url`, `instance_id`.

### 2.4 GitHub

```bash
REPO=DewaSRY/DewaSRY_HUB

# `production` environment, deployable from main only (the OIDC role trusts only this environment)
gh api -X PUT repos/$REPO/environments/production \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true'
gh api -X POST repos/$REPO/environments/production/deployment-branch-policies -f name=main -f type=branch

# Backend variables
gh variable set AWS_ROLE_ARN   --env production --body "$(terraform -chdir=infra/terraform output -raw github_deploy_role_arn)"
gh variable set AWS_REGION     --env production --body ap-southeast-1
gh variable set ECR_REPOSITORY --env production --body hub/coreservices
gh variable set API_BASE_URL   --env production --body https://api.dewasuryahub.com

# Protect main: PRs only, the three checks must pass (skipped jobs count as passed)
gh api -X PUT repos/$REPO/branches/main/protection --input - <<'EOF'
{
  "required_status_checks": { "strict": false, "contexts": ["backend-test", "portal-check", "infra-check"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

Each workflow always runs a small `changes` job and skips its real jobs when none of its paths
changed. A skipped job counts as a passed required check. (A workflow skipped by `on.paths` would
leave the check pending forever.)

Private repository: check that your plan includes `ubuntu-24.04-arm` runners. If it does not,
change `runs-on` for `test` and `image` to `ubuntu-24.04` and add
`docker/setup-qemu-action` before the build. The Dockerfile already builds the jar natively
(`$BUILDPLATFORM`), so only the small runtime stage runs under emulation.

### 2.5 Cloudflare (API side)

1. SSL/TLS → Origin Server → **Create certificate** for `api.dewasuryahub.com`. Save it as
   `origin.pem` and `origin.key`, and store both in SSM (2.2). Delete the local copies.
2. SSL/TLS mode: **Full (strict)**.
3. DNS: `api` → `A` → `elastic_ip` output, **Proxied** (orange cloud).
4. Cache Rule: bypass the cache for `api.dewasuryahub.com/*`.

### 2.6 First deploy

```bash
make deploy-dispatch     # backend.yml on main: test → image → deploy
make deploy-watch
```

Then check:

```bash
curl -s https://api.dewasuryahub.com/v1/public/products | jq .code   # 200
make release-status                                                  # ACTIVE=blue, containers up
```

### 2.7 Test a rollback once (rollout step 6)

After a second merge has deployed, deploy the previous commit, then the current one again:

```bash
make deploy-dispatch SHA=<previous commit>
make deploy-dispatch SHA=<current commit>
```

### 2.8 Portal on Cloudflare Workers

```bash
cd apps/portal
npx wrangler d1 create dewa-surya-hub-portal-tag-cache    # put the id into wrangler.jsonc (P7)
npx wrangler r2 bucket create dewa-surya-hub-portal-opennext-cache
npx wrangler secret put REVALIDATE_SECRET                 # same value as SSM HUB_REVALIDATE_SECRET
```

Create a Cloudflare API token for this account with **Workers Scripts: Edit**, **Workers R2
Storage: Edit**, **D1: Edit**, and **Workers Routes: Edit** on the zone. Then add it to GitHub:

```bash
gh secret set CLOUDFLARE_API_TOKEN  --env production
gh secret set CLOUDFLARE_ACCOUNT_ID --env production

# Public build-time values (not secrets, ADR-005 §4)
for kv in \
  NEXT_PUBLIC_SITE_URL=https://dewasuryahub.com \
  NEXT_PUBLIC_API_URL=https://api.dewasuryahub.com/v1 \
  NEXT_PUBLIC_FIREBASE_API_KEY=... NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=... NEXT_PUBLIC_FIREBASE_APP_ID=... \
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=... NEXT_PUBLIC_MIDTRANS_SANDBOX=true \
  NEXT_PUBLIC_AD_CLIENT= ; do
  gh variable set "${kv%%=*}" --env production --body "${kv#*=}"
done
```

Commit the real D1 id, then run `make portal-dispatch` (or merge a portal change). The deploy job
fails on purpose while `wrangler.jsonc` still has the placeholder id.

### 2.9 Clean up (rollout step 8)

Once ECR deploys work, delete the `sdewa/core-service-dep` repository on Docker Hub.

---

## 3. Everyday development

### 3.1 The loop

```bash
git switch -c feat/<thing>

# backend
docker compose up -d postgres                  # or the full stack: docker compose up --build
make -C apps/coreservices run                  # local profile, fake integrations
make -C apps/coreservices test

# portal
cd apps/portal && yarn dev
yarn lint && yarn typecheck && yarn test

git push -u origin feat/<thing>
gh pr create --fill
gh pr checks --watch                           # backend-test / portal-check / infra-check
gh pr merge --squash --delete-branch           # merging deploys automatically
make deploy-watch                              # follow the backend deploy
```

A merge to `main` is the only way code reaches production. Nothing is built on your laptop.

### 3.2 Backend change checklist

- **API shape changed?** `OpenApiContractTest` fails in CI when `/v1/openapi.json` differs from
  `contracts/openapi/v1.json`. If the change is intended, run
  `make -C apps/coreservices contract-update`, review `git diff contracts/`, and commit it. Keep
  `/v1` changes additive (ADR-003). The portal may be older than the API.
- **Migration?** Add a new `V<n>__*.sql`. Never edit, rename, or delete an applied one: CI blocks
  it. Follow **expand/contract**:
  - Release N: add tables, nullable columns, or columns with defaults. Change the code.
  - Release N+1 or later: drop or rename what N stopped using.

  Both colors run against the new schema for a few seconds, and a rollback runs the old code
  against it, so each migration must work with the previous release too.
- **Big index?** Use `CREATE INDEX CONCURRENTLY` in its own migration, with
  `-- flyway:executeInTransaction=false` at the top.
- **New config key?** Add it to `application-prod.yaml`, create `/hub/prod/<KEY>` in SSM **before**
  merging, and add it to `REQUIRED_KEYS` in `infra/deploy/deploy.sh` if it has no default.

### 3.3 Portal change

Merging deploys with `opennextjs-cloudflare deploy`. A new `NEXT_PUBLIC_*` value needs a
`production` environment variable (`gh variable set … --env production`) and an entry in the
"Write .env.production" step of `portal.yml`.

### 3.4 Infrastructure change

Terraform is applied by hand (CI only checks it):

```bash
make tf-fmt tf-validate tf-plan
make tf-apply
```

If the change touched `infra/deploy/*` or `apps/nginx/*`, Terraform uploads the new files to S3.
Then install them on the instance:

```bash
make infra-sync     # SSM Run Command → /opt/hub/bin/sync-infra.sh; reloads Nginx after nginx -t
```

Until you run it, the backend deploy job warns that `/opt/hub/deploy.sh` differs from the repo.
Changes to `user_data.sh.tpl` only affect a **new** instance
(`terraform apply -replace=aws_instance.hub_api`, then `make deploy-dispatch`).

---

## 4. Operations

### 4.1 Roll back the API

| Situation                                   | Do this                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| Deploy job failed on the instance           | Nothing. The old color is still serving. Fix, then merge again.         |
| Deployed release is bad                     | `make deploy-dispatch SHA=<last good commit>` (or Actions → backend → Run workflow → `sha`). It reuses that commit's ECR image. It does not rebuild or test. |
| GitHub is down                              | `make ssm-shell`, then `sudo cat /opt/hub/release.env` and `sudo /opt/hub/deploy.sh sha256:<previous digest> <previous sha>` |
| Bad migration                               | Fix forward with a new migration. If data was damaged, restore the dump (4.4). |

ECR keeps the newest 20 `sha-` images. Anything older cannot be redeployed without a rebuild.

### 4.2 Roll back the portal

```bash
cd apps/portal && npx wrangler rollback      # or re-run portal.yml on an earlier commit
```

### 4.3 Rotate a secret

```bash
aws ssm put-parameter --region ap-southeast-1 --overwrite --type SecureString \
  --name /hub/prod/MIDTRANS_SERVER_KEY --value '<new>'
make deploy-dispatch SHA=$(git rev-parse origin/main)   # redeploys the same image with new config
```

To rotate the revalidate secret, change SSM and `wrangler secret put REVALIDATE_SECRET` together.

### 4.4 Restore a pre-deploy dump

Dumps are kept 14 days at `s3://<ops bucket>/pre-deploy/<sha>.dump` (custom format, schema `public`).

```bash
aws s3 cp s3://$(terraform -chdir=infra/terraform output -raw ops_bucket)/pre-deploy/<sha>.dump .
pg_restore --clean --if-exists --no-owner --schema=public -d "postgresql://<user>@<host>:5432/postgres?sslmode=require" <sha>.dump
```

Restore into a scratch database first if you can.

### 4.5 Look at the instance

```bash
make release-status            # release.env and container status, through Run Command
make ssm-shell                 # interactive shell (no SSH, port 22 is closed)
  sudo -i
  cd /opt/hub
  docker compose ps -a         # note: never run a bare `docker compose up -d` (starts both colors)
  docker logs --tail 200 hub-api-blue-1
  docker logs --tail 100 hub-nginx-1
  cat nginx/hub/upstream.conf
```

Every deploy is also in AWS Console → Systems Manager → Run Command → Command history.

---

## 5. Command reference

| Command                                        | What it does                                                   |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `make deploy-dispatch`                         | Test, build, and deploy `main` HEAD                            |
| `make deploy-dispatch SHA=<commit>`            | Deploy an existing image (rollback), no rebuild                |
| `make deploy-watch`                            | Follow the latest backend run                                  |
| `make portal-dispatch`                         | Re-run the portal pipeline on `main`                           |
| `make release-status`                          | Live color, images, container status                           |
| `make ssm-shell`                               | Session Manager shell on the instance                          |
| `make infra-sync`                              | Install new deploy files and Nginx config after `tf-apply`     |
| `make ssm-list`                                | List `/hub/prod/*` parameter names                             |
| `make tf-plan` / `make tf-apply` / `make tf-output` | Terraform, by hand                                        |
| `make -C apps/coreservices test`               | Backend tests (Testcontainers; needs Docker)                   |
| `make -C apps/coreservices contract-update`    | Regenerate `contracts/openapi/v1.json`                         |
| `make -C apps/coreservices docker-build`       | Local arm64 image for `docker compose up`                      |

---

## 6. Troubleshooting

| Symptom                                                         | Cause and fix                                                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `deploy`: "No instance tagged Role=hub-api is online in SSM"    | The instance is stopped, or the SSM agent cannot reach AWS. Check Fleet Manager. The instance needs outbound 443. |
| `deploy.sh`: "missing SSM parameters under /hub/prod/: …"      | Create them (2.2) and re-run the workflow.                                                      |
| `deploy.sh`: "api-<color> stopped (exited …)"                   | Startup failed: Flyway, config, or OOM. The script printed the last 200 log lines above. The old color is still serving. |
| `deploy.sh`: pg_dump failed                                      | Wrong DB host or port (use 5432, not the 6543 pooler), or Supabase is paused. The deploy stops before starting anything. |
| Smoke test fails, but the instance says healthy                 | Usually Cloudflare: DNS not proxied, SSL mode not Full (strict), or the origin certificate is missing in SSM. The new color is already live. Roll back only if the API itself is broken. |
| Warning "/opt/hub/deploy.sh on the instance differs"            | `make tf-apply && make infra-sync`.                                                             |
| `backend-test` fails on `OpenApiContractTest`                   | Download the `backend-test-reports` artifact (`build/contracts/openapi/v1.json`), or run `make -C apps/coreservices contract-update` locally. |
| Migration guard fails                                            | You changed an applied `V*.sql`. Revert it and add a new migration.                             |
| Portal deploy: "placeholder D1 database_id"                     | Step 2.8.                                                                                       |
| PR stuck on "Expected — waiting for status"                     | A required check name does not match a job name. They must be `backend-test`, `portal-check`, `infra-check`. |

---

## 7. Where the implementation differs from ADR-007

These choices keep the ADR's behavior but differ in detail:

| ADR says                                                   | Implemented as                                                                          | Why                                                                                   |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `user_data` installs `deploy.sh`, Compose, and Nginx       | Terraform uploads them to `s3://<ops>/infra/`; `sync-infra.sh` installs them (first boot + `make infra-sync`) | Updating the files does not need an instance stop/start or a new instance.            |
| Path filters on the workflow triggers                      | A `changes` job (`.github/actions/changed`) gates the jobs                              | Required checks would stay pending on PRs that skip a workflow.                       |
| Required checks `backend / test`, `portal / check`, `infra / check` | Job names `backend-test`, `portal-check`, `infra-check`                        | Unique check names for branch protection.                                             |
| One `app.env`, one `secrets/firebase.json`                 | `app.<color>.env` and `secrets/<color>/` per color                                      | A failed deploy never changes the config of the color that is serving.                |
| Origin certificate written by `user_data` (ADR-006 T4)     | Rendered by `deploy.sh` from `/hub/prod/files/origin.*`                                 | Same place as other secrets, and rotating it only needs a redeploy.                   |
| The OIDC role is used by the `deploy` job                  | The `image` job also uses the `production` environment                                  | The role trusts only `environment:production`, and ECR push needs it.                 |
| One Nginx config file                                      | `apps/nginx/zones.conf` + `routes.conf` shared; `server.local.conf` / `server.prod.conf` per environment | Local and production cannot drift; only TLS and the upstream differ.                  |
