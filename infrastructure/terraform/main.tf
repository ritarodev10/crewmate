terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

locals {
  azs = ["us-east-1a", "us-east-1b"]
}

# ---------------------------------------------------------------------------
# Module: network
# Provisions VPC, subnets, NAT gateway, and security groups.
# ---------------------------------------------------------------------------
module "network" {
  source      = "./network"
  aws_region  = var.aws_region
  environment = var.environment
}

# ---------------------------------------------------------------------------
# Module: data
# Provisions RDS Postgres 17, ElastiCache Redis 7, and S3 buckets.
# ---------------------------------------------------------------------------
module "data" {
  source             = "./data"
  environment        = var.environment
  account_id         = data.aws_caller_identity.current.account_id
  private_subnet_ids = module.network.private_subnet_ids
  rds_sg_id          = module.network.rds_sg_id
  redis_sg_id        = module.network.redis_sg_id
}

# ---------------------------------------------------------------------------
# Module: secrets
# Provisions Secrets Manager entries, ECS IAM roles, and GitHub OIDC.
# ---------------------------------------------------------------------------
module "secrets" {
  source              = "./secrets"
  environment         = var.environment
  account_id          = data.aws_caller_identity.current.account_id
  aws_region          = var.aws_region
  db_endpoint         = module.data.db_endpoint
  redis_endpoint      = module.data.redis_endpoint
  assets_bucket_name  = module.data.assets_bucket_name
}

# ---------------------------------------------------------------------------
# Module: compute
# Provisions ECS cluster, ECR, ALB, and CloudWatch log groups.
# ---------------------------------------------------------------------------
module "compute" {
  source                       = "./compute"
  environment                  = var.environment
  aws_region                   = var.aws_region
  vpc_id                       = module.network.vpc_id
  public_subnet_ids            = module.network.public_subnet_ids
  private_subnet_ids           = module.network.private_subnet_ids
  alb_sg_id                    = module.network.alb_sg_id
  ecs_sg_id                    = module.network.ecs_sg_id
  ecs_task_execution_role_arn  = module.secrets.ecs_task_execution_role_arn
  ecs_task_role_arn            = module.secrets.ecs_task_role_arn
  db_url_secret_arn            = module.secrets.db_url_secret_arn
  redis_url_secret_arn         = module.secrets.redis_url_secret_arn
  jwt_access_secret_arn        = module.secrets.jwt_access_secret_arn
  jwt_refresh_secret_arn       = module.secrets.jwt_refresh_secret_arn
  webhook_signing_secret_arn   = module.secrets.webhook_signing_secret_arn
  cloudflare_shared_secret_arn = module.secrets.cloudflare_shared_secret_arn
}
