# --- Instance role (I3): SSM agent, ECR pull, /hub/prod/* parameters, ops bucket, media bucket ---

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "hub_api" {
  name               = "hub-api-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "hub_api_ssm_core" {
  role       = aws_iam_role.hub_api.name
  policy_arn = "arn:${local.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

locals {
  ssm_prefix_arn = "arn:${local.partition}:ssm:${var.aws_region}:${local.account_id}:parameter${trimsuffix(var.ssm_prefix, "/")}"
}

data "aws_iam_policy_document" "hub_api" {
  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPull"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [aws_ecr_repository.coreservices.arn]
  }

  # deploy.sh renders app.<color>.env, firebase.json, and the origin certificate from here (§8.4).
  statement {
    sid       = "RuntimeConfig"
    actions   = ["ssm:GetParametersByPath", "ssm:GetParameter", "ssm:GetParameters"]
    resources = [local.ssm_prefix_arn, "${local.ssm_prefix_arn}/*"]
  }

  statement {
    sid       = "OpsBucketRead"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.ops.arn}/infra/*"]
  }

  statement {
    sid       = "OpsBucketList"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.ops.arn]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["infra/*"]
    }
  }

  # Pre-deploy dumps (§9 M5). Write only; restores are done from a laptop.
  statement {
    sid       = "OpsBucketBackups"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.ops.arn}/pre-deploy/*", "${aws_s3_bucket.ops.arn}/backups/*"]
  }

  dynamic "statement" {
    for_each = var.media_bucket_name == "" ? [] : [var.media_bucket_name]
    content {
      sid       = "MediaBucket"
      actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
      resources = ["arn:${local.partition}:s3:::${statement.value}/*"]
    }
  }
}

resource "aws_iam_role_policy" "hub_api" {
  name   = "hub-api"
  role   = aws_iam_role.hub_api.id
  policy = data.aws_iam_policy_document.hub_api.json
}

resource "aws_iam_instance_profile" "hub_api" {
  name = "hub-api-instance"
  role = aws_iam_role.hub_api.name
}

# --- GitHub OIDC (§7, I6): no AWS keys in GitHub ---

resource "aws_iam_openid_connect_provider" "github" {
  count          = var.create_github_oidc_provider ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_github_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  github_oidc_provider_arn = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

# Only jobs that name the `production` environment can assume the role. That environment is
# limited to the main branch in GitHub, so PR jobs cannot (§7, W4).
data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:environment:production"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name                 = "hub-github-deploy"
  assume_role_policy   = data.aws_iam_policy_document.github_assume.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPushAndLookup"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:BatchGetImage",
      "ecr:DescribeImages",
      "ecr:DescribeImageScanFindings",
    ]
    resources = [aws_ecr_repository.coreservices.arn]
  }

  statement {
    sid       = "RunDeployDocument"
    actions   = ["ssm:SendCommand"]
    resources = [aws_ssm_document.hub_deploy.arn]
  }

  statement {
    sid       = "RunOnHubApiInstances"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:${local.partition}:ec2:${var.aws_region}:${local.account_id}:instance/*"]
    condition {
      test     = "StringEquals"
      variable = "ssm:resourceTag/Role"
      values   = ["hub-api"]
    }
  }

  statement {
    sid = "ReadCommandStatus"
    actions = [
      "ssm:GetCommandInvocation",
      "ssm:ListCommandInvocations",
      "ssm:ListCommands",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "hub-github-deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}
