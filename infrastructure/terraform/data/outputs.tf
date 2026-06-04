output "db_endpoint" {
  description = "RDS Postgres endpoint (host:port)"
  value       = "${aws_db_instance.crewmate_postgres.address}:${aws_db_instance.crewmate_postgres.port}"
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint (host:port)"
  value       = "${aws_elasticache_cluster.crewmate_redis.cache_nodes[0].address}:${aws_elasticache_cluster.crewmate_redis.cache_nodes[0].port}"
}

output "assets_bucket_name" {
  description = "Name of the S3 assets bucket"
  value       = aws_s3_bucket.crewmate_assets.bucket
}
