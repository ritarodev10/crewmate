output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer (AWS-issued, not public-facing domain)"
  value       = module.compute.alb_dns_name
}

output "ecr_repo_url" {
  description = "ECR repository URL for the crewmate-api image"
  value       = module.compute.ecr_repo_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.compute.ecs_cluster_name
}

output "api_service_name" {
  description = "Name of the ECS API service"
  value       = module.compute.api_service_name
}

output "worker_service_name" {
  description = "Name of the ECS worker service"
  value       = module.compute.worker_service_name
}

output "github_actions_role_arn" {
  description = "ARN of the IAM role for GitHub Actions OIDC (set as AWS_DEPLOY_ROLE_ARN in GitHub Actions secrets)"
  value       = module.secrets.github_actions_role_arn
}

output "ecs_sg_id" {
  description = "Security group ID for ECS tasks (set as ECS_SG_ID in GitHub Actions secrets)"
  value       = module.network.ecs_sg_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs (use one as ECS_PRIVATE_SUBNET_ID in GitHub Actions secrets)"
  value       = module.network.private_subnet_ids
}

output "cloudflare_shared_secret_arn" {
  description = "ARN of the Cloudflare shared secret in Secrets Manager"
  value       = module.secrets.cloudflare_shared_secret_arn
  sensitive   = true
}

output "account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}
