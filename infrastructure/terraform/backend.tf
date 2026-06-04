terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}

# Remote S3 backend (enable in Phase 5):
# terraform {
#   backend "s3" {
#     bucket         = "crewmate-tf-state-382888552421"
#     key            = "prod/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "crewmate-tf-lock"
#     encrypt        = true
#   }
# }
