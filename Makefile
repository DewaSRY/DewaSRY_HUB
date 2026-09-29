# Root tasks: Terraform and production operations (ADR-007). App tasks live in apps/*/Makefile.
# Runbook with the full flow: docs/DEPLOYMENT.md.

CORE_SERVICE_DIR := apps/coreservices
TF_DIR     := infra/terraform
AWS_REGION ?= ap-southeast-1
SSM_PREFIX ?= /hub/prod/
# Deploy an earlier build (rollback): make deploy-dispatch SHA=<commit>
SHA        ?=

## --- Terraform (applied by hand; CI only runs fmt/validate) ---

tf-init:
	terraform -chdir=$(TF_DIR) init

tf-fmt:
	terraform -chdir=$(TF_DIR) fmt -recursive

tf-validate:
	terraform -chdir=$(TF_DIR) validate

tf-plan:
	terraform -chdir=$(TF_DIR) plan

tf-apply:
	terraform -chdir=$(TF_DIR) apply

tf-output:
	terraform -chdir=$(TF_DIR) output

tf-destroy:
	terraform -chdir=$(TF_DIR) destroy

## --- Deploy (CI does the work; these only trigger or inspect it) ---

# Runs backend.yml on main. Without SHA: test, build, and deploy main's HEAD (first deploy after a
# new instance, B9). With SHA: deploy that commit's existing image, no rebuild (rollback, §10).
deploy-dispatch:
	gh workflow run backend.yml --ref main $(if $(SHA),-f sha=$(SHA))
	@sleep 3
	gh run list --workflow backend.yml --limit 1

deploy-watch:
	gh run watch $$(gh run list --workflow backend.yml --limit 1 --json databaseId --jq '.[0].databaseId')

portal-dispatch:
	gh workflow run portal.yml --ref main

## --- Instance (Session Manager / Run Command; no SSH) ---

INSTANCE_ID = $(shell terraform -chdir=$(TF_DIR) output -raw instance_id)

# Shell on the instance. Needs the AWS Session Manager plugin.
ssm-shell:
	aws ssm start-session --region $(AWS_REGION) --target $(INSTANCE_ID)

# After a `make tf-apply` that changed infra/deploy/* or apps/nginx/*: install the new files.
infra-sync:
	@cmd=$$(aws ssm send-command --region $(AWS_REGION) \
		--document-name AWS-RunShellScript \
		--targets Key=tag:Role,Values=hub-api \
		--parameters 'commands=["/opt/hub/bin/sync-infra.sh"]' \
		--query Command.CommandId --output text) && \
	echo "command $$cmd" && \
	aws ssm wait command-executed --region $(AWS_REGION) --command-id $$cmd --instance-id $(INSTANCE_ID); \
	aws ssm get-command-invocation --region $(AWS_REGION) --command-id $$cmd --instance-id $(INSTANCE_ID) \
		--query '[Status,StandardOutputContent,StandardErrorContent]' --output text

# Which color is live and which image each color runs.
release-status:
	@cmd=$$(aws ssm send-command --region $(AWS_REGION) \
		--document-name AWS-RunShellScript \
		--targets Key=tag:Role,Values=hub-api \
		--parameters 'commands=["cat /opt/hub/release.env","docker ps --format \"{{.Names}} {{.Status}}\""]' \
		--query Command.CommandId --output text) && \
	aws ssm wait command-executed --region $(AWS_REGION) --command-id $$cmd --instance-id $(INSTANCE_ID); \
	aws ssm get-command-invocation --region $(AWS_REGION) --command-id $$cmd --instance-id $(INSTANCE_ID) \
		--query StandardOutputContent --output text

# Names (not values) of the runtime parameters deploy.sh reads.
ssm-list:
	aws ssm get-parameters-by-path --region $(AWS_REGION) --path $(SSM_PREFIX) --recursive \
		--query 'Parameters[].[Name,Type,LastModifiedDate]' --output table

.PHONY: tf-init tf-fmt tf-validate tf-plan tf-apply tf-output tf-destroy \
	deploy-dispatch deploy-watch portal-dispatch ssm-shell infra-sync release-status ssm-list
