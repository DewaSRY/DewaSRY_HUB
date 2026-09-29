variable "aws_region" {
  description = "AWS region for every resource (ADR-001 §5.4)"
  type        = string
  default     = "ap-southeast-1"
}

variable "instance_type" {
  description = "Graviton (arm64) instance type; must match the linux/arm64 image (ADR-007 I1)"
  type        = string
  default     = "t4g.small"

  validation {
    condition     = can(regex("^[a-z]+[0-9]+g[a-z]*\\.", var.instance_type))
    error_message = "instance_type must be a Graviton (arm64) type such as t4g.small; the image is linux/arm64."
  }
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size. Holds two API images, Nginx, Docker logs, and the 2 GB swap file."
  type        = number
  default     = 20
}

variable "docker_compose_version" {
  description = "docker compose CLI plugin release installed at first boot (https://github.com/docker/compose/releases)"
  type        = string
  default     = "v5.5.1"
}

variable "cloudflare_ipv4_cidrs" {
  description = "Cloudflare IPv4 ranges (https://www.cloudflare.com/ips-v4). Only these reach port 443, and Nginx trusts CF-Connecting-IP only from them (ADR-006 T1, T2). Check quarterly."
  type        = list(string)
  default = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ]
}

variable "ecr_repository_name" {
  description = "ECR repository for the API image (ADR-007 §6.3)"
  type        = string
  default     = "hub/coreservices"
}

variable "github_repository" {
  description = "owner/name of the GitHub repository whose `production` environment may assume hub-github-deploy"
  type        = string
  default     = "DewaSRY/DewaSRY_HUB"
}

variable "create_github_oidc_provider" {
  description = "Create the token.actions.githubusercontent.com OIDC provider. Set false if the account already has one (only one per account is allowed)."
  type        = bool
  default     = true
}

variable "ssm_prefix" {
  description = "SSM Parameter Store path that deploy.sh reads at every deploy (ADR-007 §8.4). Must end with /."
  type        = string
  default     = "/hub/prod/"

  validation {
    condition     = can(regex("^/.+/$", var.ssm_prefix))
    error_message = "ssm_prefix must start and end with /."
  }
}

variable "ops_bucket_name" {
  description = "Bucket for deploy files and database dumps. Empty = hub-ops-<account id>."
  type        = string
  default     = ""
}

variable "media_bucket_name" {
  description = "Existing S3 bucket for article images (HUB_S3_BUCKET). Empty = no media permissions on the instance role yet."
  type        = string
  default     = ""
}
