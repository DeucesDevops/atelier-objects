data "aws_caller_identity" "current" {}

locals {
  services = [
    "api-gateway",
    "web-app",
    "auth-service",
    "catalog-service",
    "order-service",
    "inventory-service",
    "payment-service",
    "notification-service",
    "analytics-service",
  ]
  tags = {
    Project     = "atelier"
    Environment = var.environment
  }
  image_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

module "network" {
  source = "../../modules/network"

  name               = var.cluster_name
  vpc_cidr           = var.vpc_cidr
  az_count           = var.az_count
  single_nat_gateway = var.single_nat_gateway
  tags               = local.tags
}

module "cluster" {
  source = "../../modules/cluster"

  cluster_name           = var.cluster_name
  cluster_version        = var.cluster_version
  vpc_id                 = module.network.vpc_id
  private_subnet_ids     = module.network.private_subnet_ids
  endpoint_public_access = var.endpoint_public_access
  public_access_cidrs    = var.public_access_cidrs
  node_instance_types    = var.node_instance_types
  node_desired_size      = var.node_desired_size
  node_min_size          = var.node_min_size
  node_max_size          = var.node_max_size
  admin_principal_arns   = var.admin_principal_arns
  tags                   = local.tags
}

module "ecr" {
  source = "../../modules/ecr"

  services          = local.services
  repository_prefix = var.ecr_repository_prefix
  tags              = local.tags
}

module "dns" {
  source = "../../modules/dns"

  domain = var.domain
  tags   = local.tags
}

module "storage" {
  source = "../../modules/storage"

  name_prefix = var.cluster_name
  tags        = local.tags
}

module "identity" {
  source = "../../modules/identity"

  cluster_name                = module.cluster.cluster_name
  oidc_provider_arn           = module.cluster.oidc_provider_arn
  oidc_provider_url           = module.cluster.oidc_provider_url
  github_repository           = var.github_repository
  create_github_oidc_provider = var.create_github_oidc_provider
  github_oidc_provider_arn    = var.github_oidc_provider_arn
  state_bucket_arn            = var.state_bucket_arn
  ecr_repository_arns         = values(module.ecr.repository_arns)
  zone_id                     = module.dns.zone_id
  tags                        = local.tags
}

module "platform" {
  source = "../../modules/platform"

  cluster_name                  = module.cluster.cluster_name
  aws_region                    = var.aws_region
  vpc_id                        = module.network.vpc_id
  domain                        = var.domain
  alb_controller_role_arn       = module.identity.alb_controller_role_arn
  external_dns_role_arn         = module.identity.external_dns_role_arn
  external_secrets_role_arn     = module.identity.external_secrets_role_arn
  karpenter_controller_role_arn = module.identity.karpenter_controller_role_arn
  karpenter_queue_name          = module.identity.karpenter_queue_name
  acm_certificate_arn           = module.dns.certificate_arn
  git_repo_url                  = var.git_repo_url
  git_revision                  = var.git_revision
  image_registry                = local.image_registry
  image_prefix                  = var.ecr_repository_prefix
  helm_value_files              = ["values.yaml"]
  prometheus_retention          = var.prometheus_retention
}
