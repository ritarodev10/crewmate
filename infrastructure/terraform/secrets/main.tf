# ---------------------------------------------------------------------------
# Random values for secrets (no hardcoded passwords anywhere)
# ---------------------------------------------------------------------------
resource "random_id" "jwt_access_secret" {
  byte_length = 32
}

resource "random_id" "jwt_refresh_secret" {
  byte_length = 32
}

resource "random_id" "webhook_signing_secret" {
  byte_length = 32
}

resource "random_id" "cloudflare_shared_secret" {
  byte_length = 32
}

# ---------------------------------------------------------------------------
# AWS Secrets Manager — 6 secrets for the ECS api + worker tasks
# ---------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "db_url" {
  name        = "crewmate/db_url"
  description = "PostgreSQL connection URL for the crewmate api and worker services"

  tags = {
    environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = "postgresql://crewmate:${var.db_password}@${var.db_endpoint}/crewmate"
}

resource "aws_secretsmanager_secret" "redis_url" {
  name        = "crewmate/redis_url"
  description = "Redis connection URL for BullMQ and session cache"

  tags = {
    environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id     = aws_secretsmanager_secret.redis_url.id
  secret_string = "redis://${var.redis_endpoint}"
}

resource "aws_secretsmanager_secret" "jwt_access_secret" {
  name        = "crewmate/jwt_access_secret"
  description = "JWT access token signing secret (64-char hex)"

  tags = {
    environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "jwt_access_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_access_secret.id
  secret_string = random_id.jwt_access_secret.hex
}

resource "aws_secretsmanager_secret" "jwt_refresh_secret" {
  name        = "crewmate/jwt_refresh_secret"
  description = "JWT refresh token signing secret (64-char hex)"

  tags = {
    environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "jwt_refresh_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_refresh_secret.id
  secret_string = random_id.jwt_refresh_secret.hex
}

resource "aws_secretsmanager_secret" "webhook_signing_secret" {
  name        = "crewmate/webhook_signing_secret"
  description = "HMAC secret for signing outbound webhook payloads"

  tags = {
    environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "webhook_signing_secret" {
  secret_id     = aws_secretsmanager_secret.webhook_signing_secret.id
  secret_string = random_id.webhook_signing_secret.hex
}

resource "aws_secretsmanager_secret" "cloudflare_shared_secret" {
  name        = "crewmate/cloudflare_shared_secret"
  description = "Shared secret injected by the Cloudflare Worker as x-cloudflare-secret header"

  tags = {
    environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "cloudflare_shared_secret" {
  secret_id     = aws_secretsmanager_secret.cloudflare_shared_secret.id
  secret_string = random_id.cloudflare_shared_secret.hex
}

# ---------------------------------------------------------------------------
# ECS Task Execution Role
# Allows ECS to pull secrets from Secrets Manager and push logs to CloudWatch.
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "ecs_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "crewmate_ecs_execution" {
  name               = "crewmate_ecs_execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_trust.json

  tags = {
    Name        = "crewmate_ecs_execution"
    environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.crewmate_ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy_attachment" "ecs_execution_ssm" {
  role       = aws_iam_role.crewmate_ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${var.account_id}:secret:crewmate/*",
    ]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "crewmate_ecs_execution_secrets"
  role   = aws_iam_role.crewmate_ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}

# ---------------------------------------------------------------------------
# ECS Task Role
# Runtime app permissions — S3 access for asset uploads.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "crewmate_ecs_task" {
  name               = "crewmate_ecs_task"
  assume_role_policy = data.aws_iam_policy_document.ecs_trust.json

  tags = {
    Name        = "crewmate_ecs_task"
    environment = var.environment
  }
}

data "aws_iam_policy_document" "ecs_task_s3" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
    ]
    resources = [
      "arn:aws:s3:::${var.assets_bucket_name}/*",
    ]
  }
}

resource "aws_iam_role_policy" "ecs_task_s3" {
  name   = "crewmate_ecs_task_s3"
  role   = aws_iam_role.crewmate_ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_s3.json
}

# ---------------------------------------------------------------------------
# GitHub Actions OIDC
# ---------------------------------------------------------------------------
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # GitHub OIDC thumbprint (stable, last verified 2026-06)
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = {
    Name        = "github_oidc"
    environment = var.environment
  }
}

data "aws_iam_policy_document" "github_oidc_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:ritarodev10/crewmate:*"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "crewmate_github_actions" {
  name               = "crewmate_github_actions"
  assume_role_policy = data.aws_iam_policy_document.github_oidc_trust.json

  tags = {
    Name        = "crewmate_github_actions"
    environment = var.environment
  }
}

data "aws_iam_policy_document" "github_actions_permissions" {
  # ECR authorization token (account-level, not scoped to a specific repo)
  statement {
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # ECR image push to crewmate-api repository
  statement {
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [
      "arn:aws:ecr:${var.aws_region}:${var.account_id}:repository/crewmate-api",
    ]
  }

  # ECS deploy — update services and run one-shot migration task
  statement {
    effect = "Allow"
    actions = [
      "ecs:UpdateService",
      "ecs:DescribeServices",
      "ecs:RunTask",
      "ecs:DescribeTaskDefinition",
      "ecs:RegisterTaskDefinition",
    ]
    resources = [
      "arn:aws:ecs:${var.aws_region}:${var.account_id}:cluster/crewmate",
      "arn:aws:ecs:${var.aws_region}:${var.account_id}:service/crewmate/*",
      "arn:aws:ecs:${var.aws_region}:${var.account_id}:task-definition/crewmate-*",
    ]
  }

  # Allow ECS RunTask to pass the task execution role
  statement {
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.crewmate_ecs_execution.arn]
  }

  # Secrets Manager read (for prisma migrate deploy in the one-shot run-task)
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["arn:aws:secretsmanager:${var.aws_region}:${var.account_id}:secret:crewmate/*"]
  }
}

resource "aws_iam_role_policy" "github_actions_permissions" {
  name   = "crewmate_github_actions_permissions"
  role   = aws_iam_role.crewmate_github_actions.id
  policy = data.aws_iam_policy_document.github_actions_permissions.json
}
