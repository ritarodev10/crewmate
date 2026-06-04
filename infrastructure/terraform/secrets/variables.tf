variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "account_id" {
  description = "AWS account ID"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "db_endpoint" {
  description = "RDS Postgres endpoint (host:port) from the data module"
  type        = string
}

variable "redis_endpoint" {
  description = "ElastiCache Redis endpoint (host:port) from the data module"
  type        = string
}

variable "assets_bucket_name" {
  description = "Name of the S3 assets bucket from the data module"
  type        = string
}

variable "db_password" {
  description = "RDS master password (generated at root level to avoid circular dependency)"
  type        = string
  sensitive   = true
}
