# ---------------------------------------------------------------------------
# RDS Postgres 17
# ---------------------------------------------------------------------------
resource "aws_db_subnet_group" "crewmate" {
  name       = "crewmate_db_subnet_group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "crewmate_db_subnet_group"
    environment = var.environment
  }
}

resource "aws_db_instance" "crewmate_postgres" {
  identifier        = "crewmate-postgres"
  engine            = "postgres"
  engine_version    = "17"
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = "crewmate"
  username = "crewmate"
  password = var.db_password

  vpc_security_group_ids = [var.rds_sg_id]
  db_subnet_group_name   = aws_db_subnet_group.crewmate.name

  backup_retention_period = 7
  skip_final_snapshot     = true
  multi_az                = false

  # Disable public accessibility — only accessible from within the VPC
  publicly_accessible = false

  tags = {
    Name        = "crewmate_postgres"
    environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# ElastiCache Redis 7
# ---------------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "crewmate" {
  name       = "crewmate-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "crewmate_redis_subnet_group"
    environment = var.environment
  }
}

resource "aws_elasticache_cluster" "crewmate_redis" {
  cluster_id           = "crewmate-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  security_group_ids = [var.redis_sg_id]
  subnet_group_name  = aws_elasticache_subnet_group.crewmate.name

  tags = {
    Name        = "crewmate_redis"
    environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# S3 Buckets
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "crewmate_assets" {
  bucket = "crewmate-assets-${var.account_id}"

  tags = {
    Name        = "crewmate_assets"
    environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "crewmate_assets" {
  bucket = aws_s3_bucket.crewmate_assets.id
  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_public_access_block" "crewmate_assets" {
  bucket = aws_s3_bucket.crewmate_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "crewmate_audit_archive" {
  bucket = "crewmate-audit-archive-${var.account_id}"

  tags = {
    Name        = "crewmate_audit_archive"
    environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "crewmate_audit_archive" {
  bucket = aws_s3_bucket.crewmate_audit_archive.id
  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_public_access_block" "crewmate_audit_archive" {
  bucket = aws_s3_bucket.crewmate_audit_archive.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
