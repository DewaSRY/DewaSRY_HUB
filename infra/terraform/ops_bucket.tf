# --- Ops bucket: deploy files (infra/), pre-deploy dumps (pre-deploy/), daily dumps (backups/) ---

resource "aws_s3_bucket" "ops" {
  bucket = local.ops_bucket
}

resource "aws_s3_bucket_public_access_block" "ops" {
  bucket                  = aws_s3_bucket.ops.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "ops" {
  bucket = aws_s3_bucket.ops.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ops" {
  bucket = aws_s3_bucket.ops.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "ops" {
  bucket = aws_s3_bucket.ops.id

  rule {
    id     = "pre-deploy-dumps"
    status = "Enabled"
    filter {
      prefix = "pre-deploy/"
    }
    expiration {
      days = 14
    }
  }

  rule {
    id     = "daily-dumps"
    status = "Enabled"
    filter {
      prefix = "backups/"
    }
    expiration {
      days = 30
    }
  }
}

# --- Deploy files (I7, I8): uploaded from the repo, installed by sync-infra.sh ---
# Changing any of these needs `terraform apply` and then `make infra-sync`.

locals {
  deploy_files = {
    "infra/deploy.sh"                  = "${path.module}/../deploy/deploy.sh"
    "infra/sync-infra.sh"              = "${path.module}/../deploy/sync-infra.sh"
    "infra/docker-compose.yml"         = "${path.module}/../deploy/docker-compose.prod.yaml"
    "infra/nginx/conf.d/00-zones.conf" = "${path.module}/../../apps/nginx/zones.conf"
    "infra/nginx/conf.d/default.conf"  = "${path.module}/../../apps/nginx/server.prod.conf"
    "infra/nginx/hub/routes.conf"      = "${path.module}/../../apps/nginx/routes.conf"
  }
}

resource "aws_s3_object" "deploy_files" {
  for_each = local.deploy_files

  bucket       = aws_s3_bucket.ops.id
  key          = each.key
  source       = each.value
  etag         = filemd5(each.value)
  content_type = "text/plain"
}

# The same Cloudflare list as the security group, so the two cannot drift (ADR-006 T2).
resource "aws_s3_object" "cloudflare_realip" {
  bucket       = aws_s3_bucket.ops.id
  key          = "infra/nginx/conf.d/01-cloudflare-realip.conf"
  content_type = "text/plain"
  content      = <<-EOT
    # Rendered by Terraform from var.cloudflare_ipv4_cidrs (ADR-006 T2).
    ${join("\n", [for cidr in var.cloudflare_ipv4_cidrs : "set_real_ip_from ${cidr};"])}
    real_ip_header CF-Connecting-IP;
  EOT
}
