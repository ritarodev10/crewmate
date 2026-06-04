output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer (use as BACKEND_ORIGIN in wrangler secret put)"
  value       = aws_lb.crewmate_alb.dns_name
}

output "ecr_repo_url" {
  description = "ECR repository URL for the crewmate-api image (use as ECR_REPO_URL in GitHub Actions secrets)"
  value       = aws_ecr_repository.crewmate_api.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.crewmate.name
}

output "api_service_name" {
  description = "Name of the ECS API service"
  value       = aws_ecs_service.crewmate_api.name
}

output "worker_service_name" {
  description = "Name of the ECS worker service"
  value       = aws_ecs_service.crewmate_worker.name
}
