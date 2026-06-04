output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role (used by ECS to pull secrets and push logs)"
  value       = aws_iam_role.crewmate_ecs_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role (runtime app permissions)"
  value       = aws_iam_role.crewmate_ecs_task.arn
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions OIDC role (set as AWS_DEPLOY_ROLE_ARN in GitHub Actions secrets)"
  value       = aws_iam_role.crewmate_github_actions.arn
}

output "db_url_secret_arn" {
  description = "ARN of the crewmate/db_url secret in Secrets Manager"
  value       = aws_secretsmanager_secret.db_url.arn
}

output "redis_url_secret_arn" {
  description = "ARN of the crewmate/redis_url secret in Secrets Manager"
  value       = aws_secretsmanager_secret.redis_url.arn
}

output "jwt_access_secret_arn" {
  description = "ARN of the crewmate/jwt_access_secret in Secrets Manager"
  value       = aws_secretsmanager_secret.jwt_access_secret.arn
}

output "jwt_refresh_secret_arn" {
  description = "ARN of the crewmate/jwt_refresh_secret in Secrets Manager"
  value       = aws_secretsmanager_secret.jwt_refresh_secret.arn
}

output "webhook_signing_secret_arn" {
  description = "ARN of the crewmate/webhook_signing_secret in Secrets Manager"
  value       = aws_secretsmanager_secret.webhook_signing_secret.arn
}

output "cloudflare_shared_secret_arn" {
  description = "ARN of the crewmate/cloudflare_shared_secret in Secrets Manager"
  value       = aws_secretsmanager_secret.cloudflare_shared_secret.arn
  sensitive   = true
}
