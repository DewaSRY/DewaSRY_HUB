output "instance_id" {
  description = "EC2 instance ID (Session Manager target)"
  value       = aws_instance.hub_api.id
}

output "elastic_ip" {
  description = "Origin IP for the proxied Cloudflare `api` A record (ADR-006)"
  value       = aws_eip.hub_api.public_ip
}

output "ecr_repository_url" {
  description = "ECR repository URL. GitHub variable ECR_REPOSITORY is the part after the registry host."
  value       = aws_ecr_repository.coreservices.repository_url
}

output "github_deploy_role_arn" {
  description = "GitHub `production` environment variable AWS_ROLE_ARN"
  value       = aws_iam_role.github_deploy.arn
}

output "ops_bucket" {
  description = "Bucket for deploy files (infra/) and database dumps (pre-deploy/, backups/)"
  value       = aws_s3_bucket.ops.bucket
}

output "ssm_deploy_document" {
  description = "SSM Command document CI runs to deploy"
  value       = aws_ssm_document.hub_deploy.name
}

output "session_command" {
  description = "Open a shell on the instance (no SSH; needs the Session Manager plugin)"
  value       = "aws ssm start-session --region ${var.aws_region} --target ${aws_instance.hub_api.id}"
}
