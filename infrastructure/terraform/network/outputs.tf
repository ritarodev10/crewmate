output "vpc_id" {
  description = "ID of the crewmate VPC"
  value       = aws_vpc.crewmate_vpc.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs (2 AZs)"
  value       = [aws_subnet.public[0].id, aws_subnet.public[1].id]
}

output "private_subnet_ids" {
  description = "List of private subnet IDs (2 AZs)"
  value       = [aws_subnet.private[0].id, aws_subnet.private[1].id]
}

output "alb_sg_id" {
  description = "Security group ID for the ALB (restricted to Cloudflare IP ranges)"
  value       = aws_security_group.alb_sg.id
}

output "ecs_sg_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.ecs_sg.id
}

output "rds_sg_id" {
  description = "Security group ID for RDS Postgres"
  value       = aws_security_group.rds_sg.id
}

output "redis_sg_id" {
  description = "Security group ID for ElastiCache Redis"
  value       = aws_security_group.redis_sg.id
}
