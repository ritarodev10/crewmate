locals {
  # Cloudflare published IPv4 ranges — https://www.cloudflare.com/ips-v4
  # Last updated: 2026-06. Refresh when Cloudflare publishes IP changes.
  cloudflare_ipv4_cidrs = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ]

  azs = ["${var.aws_region}a", "${var.aws_region}b"]

  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
}

# ---------------------------------------------------------------------------
# VPC
# ---------------------------------------------------------------------------
resource "aws_vpc" "crewmate_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "crewmate_vpc"
    environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# Subnets
# ---------------------------------------------------------------------------
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.crewmate_vpc.id
  cidr_block        = local.public_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name        = "crewmate_public_${count.index + 1}"
    environment = var.environment
    tier        = "public"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.crewmate_vpc.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  map_public_ip_on_launch = false

  tags = {
    Name        = "crewmate_private_${count.index + 1}"
    environment = var.environment
    tier        = "private"
  }
}

# ---------------------------------------------------------------------------
# Internet Gateway
# ---------------------------------------------------------------------------
resource "aws_internet_gateway" "crewmate_igw" {
  vpc_id = aws_vpc.crewmate_vpc.id

  tags = {
    Name        = "crewmate_igw"
    environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# NAT Gateway (single — portfolio cost optimization)
# ---------------------------------------------------------------------------
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "crewmate_nat_eip"
    environment = var.environment
  }

  depends_on = [aws_internet_gateway.crewmate_igw]
}

resource "aws_nat_gateway" "crewmate_nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "crewmate_nat"
    environment = var.environment
  }

  depends_on = [aws_internet_gateway.crewmate_igw]
}

# ---------------------------------------------------------------------------
# Route tables
# ---------------------------------------------------------------------------
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.crewmate_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.crewmate_igw.id
  }

  tags = {
    Name        = "crewmate_public_rt"
    environment = var.environment
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.crewmate_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.crewmate_nat.id
  }

  tags = {
    Name        = "crewmate_private_rt"
    environment = var.environment
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ---------------------------------------------------------------------------
# Security Groups
# ---------------------------------------------------------------------------

# ALB SG — ingress from Cloudflare IP allowlist only (80 and 443)
resource "aws_security_group" "alb_sg" {
  name        = "crewmate_alb_sg"
  description = "ALB ingress restricted to Cloudflare IP ranges"
  vpc_id      = aws_vpc.crewmate_vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name        = "crewmate_alb_sg"
    environment = var.environment
  }
}

resource "aws_security_group_rule" "alb_ingress_http" {
  for_each = toset(local.cloudflare_ipv4_cidrs)

  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = [each.value]
  security_group_id = aws_security_group.alb_sg.id
  description       = "HTTP from Cloudflare ${each.value}"
}

resource "aws_security_group_rule" "alb_ingress_https" {
  for_each = toset(local.cloudflare_ipv4_cidrs)

  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [each.value]
  security_group_id = aws_security_group.alb_sg.id
  description       = "HTTPS from Cloudflare ${each.value}"
}

# ECS SG — ingress from ALB SG on port 3000
resource "aws_security_group" "ecs_sg" {
  name        = "crewmate_ecs_sg"
  description = "ECS tasks — ingress from ALB only"
  vpc_id      = aws_vpc.crewmate_vpc.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
    description     = "API traffic from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name        = "crewmate_ecs_sg"
    environment = var.environment
  }
}

# RDS SG — ingress from ECS SG on port 5432
resource "aws_security_group" "rds_sg" {
  name        = "crewmate_rds_sg"
  description = "RDS Postgres — ingress from ECS tasks only"
  vpc_id      = aws_vpc.crewmate_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
    description     = "Postgres from ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name        = "crewmate_rds_sg"
    environment = var.environment
  }
}

# Redis SG — ingress from ECS SG on port 6379
resource "aws_security_group" "redis_sg" {
  name        = "crewmate_redis_sg"
  description = "ElastiCache Redis — ingress from ECS tasks only"
  vpc_id      = aws_vpc.crewmate_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
    description     = "Redis from ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name        = "crewmate_redis_sg"
    environment = var.environment
  }
}
