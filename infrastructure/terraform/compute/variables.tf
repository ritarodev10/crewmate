variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID from the network module"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "alb_sg_id" {
  description = "Security group ID for the ALB"
  type        = string
}

variable "ecs_sg_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  type        = string
}

variable "db_url_secret_arn" {
  description = "ARN of the DATABASE_URL secret in Secrets Manager"
  type        = string
}

variable "redis_url_secret_arn" {
  description = "ARN of the REDIS_URL secret in Secrets Manager"
  type        = string
}

variable "jwt_access_secret_arn" {
  description = "ARN of the JWT_ACCESS_SECRET in Secrets Manager"
  type        = string
}

variable "jwt_refresh_secret_arn" {
  description = "ARN of the JWT_REFRESH_SECRET in Secrets Manager"
  type        = string
}

variable "webhook_signing_secret_arn" {
  description = "ARN of the WEBHOOK_SIGNING_SECRET in Secrets Manager"
  type        = string
}

variable "cloudflare_shared_secret_arn" {
  description = "ARN of the CLOUDFLARE_SHARED_SECRET in Secrets Manager"
  type        = string
}
