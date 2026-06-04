# ---------------------------------------------------------------------------
# ECR Repository
# ---------------------------------------------------------------------------
resource "aws_ecr_repository" "crewmate_api" {
  name                 = "crewmate-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "crewmate_api"
    environment = var.environment
  }
}

resource "aws_ecr_lifecycle_policy" "crewmate_api" {
  repository = aws_ecr_repository.crewmate_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 sha-tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
    ]
  })
}

# ---------------------------------------------------------------------------
# CloudWatch Log Groups
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "api" {
  name              = "/crewmate/api"
  retention_in_days = 14

  tags = {
    Name        = "crewmate_api_logs"
    environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/crewmate/worker"
  retention_in_days = 14

  tags = {
    Name        = "crewmate_worker_logs"
    environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# Application Load Balancer
# HTTP:80 only — Cloudflare terminates TLS at the edge.
# internet-facing = true so the Worker can reach it from outside AWS.
# ---------------------------------------------------------------------------
resource "aws_lb" "crewmate_alb" {
  name               = "crewmate-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Name        = "crewmate_alb"
    environment = var.environment
  }
}

resource "aws_lb_target_group" "crewmate_api_tg" {
  name        = "crewmate-api-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/readyz"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = {
    Name        = "crewmate_api_tg"
    environment = var.environment
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.crewmate_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.crewmate_api_tg.arn
  }
}

# ---------------------------------------------------------------------------
# ECS Cluster
# ---------------------------------------------------------------------------
resource "aws_ecs_cluster" "crewmate" {
  name = "crewmate"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = {
    Name        = "crewmate"
    environment = var.environment
  }
}

resource "aws_ecs_cluster_capacity_providers" "crewmate" {
  cluster_name = aws_ecs_cluster.crewmate.name

  capacity_providers = ["FARGATE"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# ---------------------------------------------------------------------------
# ECS Task Definition — api service
# ---------------------------------------------------------------------------
resource "aws_ecs_task_definition" "crewmate_api" {
  family                   = "crewmate-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = var.ecs_task_execution_role_arn
  task_role_arn      = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${aws_ecr_repository.crewmate_api.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      command = ["node", "dist/main.js"]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/crewmate/api"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = var.db_url_secret_arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = var.redis_url_secret_arn
        },
        {
          name      = "JWT_ACCESS_SECRET"
          valueFrom = var.jwt_access_secret_arn
        },
        {
          name      = "JWT_REFRESH_SECRET"
          valueFrom = var.jwt_refresh_secret_arn
        },
        {
          name      = "WEBHOOK_SIGNING_SECRET"
          valueFrom = var.webhook_signing_secret_arn
        },
        {
          name      = "CLOUDFLARE_SHARED_SECRET"
          valueFrom = var.cloudflare_shared_secret_arn
        },
      ]
      essential = true
    }
  ])

  tags = {
    Name        = "crewmate_api"
    environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# ECS Task Definition — worker service
# ---------------------------------------------------------------------------
resource "aws_ecs_task_definition" "crewmate_worker" {
  family                   = "crewmate-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = var.ecs_task_execution_role_arn
  task_role_arn      = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name         = "worker"
      image        = "${aws_ecr_repository.crewmate_api.repository_url}:latest"
      portMappings = []
      command      = ["node", "dist/worker.js"]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/crewmate/worker"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "worker"
        }
      }
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = var.db_url_secret_arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = var.redis_url_secret_arn
        },
        {
          name      = "JWT_ACCESS_SECRET"
          valueFrom = var.jwt_access_secret_arn
        },
        {
          name      = "JWT_REFRESH_SECRET"
          valueFrom = var.jwt_refresh_secret_arn
        },
        {
          name      = "WEBHOOK_SIGNING_SECRET"
          valueFrom = var.webhook_signing_secret_arn
        },
        {
          name      = "CLOUDFLARE_SHARED_SECRET"
          valueFrom = var.cloudflare_shared_secret_arn
        },
      ]
      essential = true
    }
  ])

  tags = {
    Name        = "crewmate_worker"
    environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# ECS Services
# ---------------------------------------------------------------------------
resource "aws_ecs_service" "crewmate_api" {
  name            = "crewmate-api"
  cluster         = aws_ecs_cluster.crewmate.id
  task_definition = aws_ecs_task_definition.crewmate_api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.crewmate_api_tg.arn
    container_name   = "api"
    container_port   = 3000
  }

  # Allow rolling deploys without downtime
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  depends_on = [aws_lb_listener.http]

  tags = {
    Name        = "crewmate_api"
    environment = var.environment
  }
}

resource "aws_ecs_service" "crewmate_worker" {
  name            = "crewmate-worker"
  cluster         = aws_ecs_cluster.crewmate.id
  task_definition = aws_ecs_task_definition.crewmate_worker.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  # No load balancer — worker processes queue jobs, not HTTP requests

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  tags = {
    Name        = "crewmate_worker"
    environment = var.environment
  }
}
