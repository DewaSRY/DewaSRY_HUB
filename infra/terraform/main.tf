# Hub API host (ADR-001 §5.4, ADR-007 §12): one Graviton instance running the arm64 image with
# blue/green Compose services behind Nginx. No SSH: shells go through Session Manager, deploys
# through the hub-deploy SSM document (ssm.tf). Secrets live in SSM Parameter Store under
# /hub/prod/*, never in Terraform variables or state.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "hub"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  partition  = data.aws_partition.current.partition
  ops_bucket = coalesce(var.ops_bucket_name, "hub-ops-${local.account_id}")
}

# --- Networking: the account's default VPC/subnet ---

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# --- AMI: latest Amazon Linux 2023 for arm64 (I1) ---

data "aws_ami" "al2023_arm64" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# --- Security group: 443 from Cloudflare only; no 22, no 80 (I4, ADR-006 T1) ---

resource "aws_security_group" "hub_api" {
  name        = "hub-api-sg"
  description = "HTTPS from Cloudflare to Nginx on the hub API host"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTPS from Cloudflare (proxied api hostname)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.cloudflare_ipv4_cidrs
  }

  # SSM agent, ECR, S3, Supabase, Midtrans, Firebase: all outbound.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "hub-api-sg"
  }
}

# --- EC2 instance ---

resource "aws_instance" "hub_api" {
  ami                    = data.aws_ami.al2023_arm64.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.hub_api.id]
  iam_instance_profile   = aws_iam_instance_profile.hub_api.name

  # IMDSv2 only. Hop limit 2 so the API container (bridge network) can use the instance role
  # for S3 through the AWS SDK.
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size_gb
    encrypted   = true
  }

  user_data_base64 = base64gzip(templatefile("${path.module}/user_data.sh.tpl", {
    aws_region             = var.aws_region
    ecr_repository_url     = aws_ecr_repository.coreservices.repository_url
    ecr_registry           = split("/", aws_ecr_repository.coreservices.repository_url)[0]
    ops_bucket             = aws_s3_bucket.ops.bucket
    ssm_prefix             = var.ssm_prefix
    docker_compose_version = var.docker_compose_version
  }))

  # user_data only runs on first boot. Later changes to deploy files go through
  # `make infra-sync`, not a new instance.
  lifecycle {
    ignore_changes = [ami, user_data_base64]
  }

  # user_data downloads these on first boot.
  depends_on = [aws_s3_object.deploy_files, aws_s3_object.cloudflare_realip]

  tags = {
    Name = "hub-api"
    Role = "hub-api"
  }
}

# --- Elastic IP (I2): stable origin address for the Cloudflare `api` record ---

resource "aws_eip" "hub_api" {
  domain   = "vpc"
  instance = aws_instance.hub_api.id

  tags = {
    Name = "hub-api"
  }
}
