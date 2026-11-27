locals {
  alb_values              = file("${path.module}/../../../platform/aws-load-balancer-controller-values.yaml")
  external_dns_values     = file("${path.module}/../../../platform/external-dns-values.yaml")
  argocd_values           = file("${path.module}/../../../platform/argocd-values.yaml")
  external_secrets_values = file("${path.module}/../../../platform/external-secrets/values.yaml")
  karpenter_values        = file("${path.module}/../../../platform/karpenter/values.yaml")
  monitoring_values       = file("${path.module}/../../../platform/monitoring-values.yaml")
}

resource "helm_release" "alb_controller" {
  name             = "aws-load-balancer-controller"
  repository       = "https://aws.github.io/eks-charts"
  chart            = "aws-load-balancer-controller"
  version          = "3.7.0"
  namespace        = "kube-system"
  create_namespace = false
  values           = [local.alb_values]
  timeout          = 600

  set {
    name  = "clusterName"
    value = var.cluster_name
  }
  set {
    name  = "region"
    value = var.aws_region
  }
  set {
    name  = "vpcId"
    value = var.vpc_id
  }
  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.alb_controller_role_arn
  }
}

resource "helm_release" "external_dns" {
  name             = "external-dns"
  repository       = "https://kubernetes-sigs.github.io/external-dns/"
  chart            = "external-dns"
  version          = "1.24.0"
  namespace        = "kube-system"
  create_namespace = false
  values           = [local.external_dns_values]
  timeout          = 600

  set {
    name  = "txtOwnerId"
    value = var.cluster_name
  }
  set {
    name  = "domainFilters[0]"
    value = var.domain
  }
  set {
    name  = "serviceAccount.name"
    value = "external-dns"
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.external_dns_role_arn
  }
}

resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "2.15.0"
  namespace        = "external-secrets"
  create_namespace = true
  values           = [local.external_secrets_values]
  timeout          = 600

  set {
    name  = "serviceAccount.name"
    value = "external-secrets"
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.external_secrets_role_arn
  }
}

resource "helm_release" "karpenter" {
  name             = "karpenter"
  repository       = "oci://public.ecr.aws/karpenter"
  chart            = "karpenter"
  version          = "1.15.3"
  namespace        = "kube-system"
  create_namespace = false
  values           = [local.karpenter_values]
  timeout          = 600

  set {
    name  = "settings.clusterName"
    value = var.cluster_name
  }
  set {
    name  = "settings.interruptionQueue"
    value = var.karpenter_queue_name
  }
  set {
    name  = "serviceAccount.name"
    value = "karpenter"
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.karpenter_controller_role_arn
  }
}

resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "10.20.0"
  namespace        = "argocd"
  create_namespace = true
  values           = [local.argocd_values]
  timeout          = 900

  set {
    name  = "global.domain"
    value = "argocd.${var.domain}"
  }
  set {
    name  = "server.ingress.hostname"
    value = "argocd.${var.domain}"
  }
  set {
    name  = "server.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/certificate-arn"
    value = var.acm_certificate_arn
  }

  depends_on = [helm_release.alb_controller]
}

resource "helm_release" "atelier_application" {
  name             = "atelier"
  namespace        = "argocd"
  chart            = "${path.module}/../../../helm/atelier-argocd-application"
  create_namespace = false
  timeout          = 300

  set {
    name  = "repoURL"
    value = var.git_repo_url
  }
  set {
    name  = "targetRevision"
    value = var.git_revision
  }
  set {
    name  = "domain"
    value = var.domain
  }
  set {
    name  = "certificateArn"
    value = var.acm_certificate_arn
  }
  set {
    name  = "image.registry"
    value = var.image_registry
  }
  set {
    name  = "image.prefix"
    value = var.image_prefix
  }
  set_list {
    name  = "valueFiles"
    value = var.helm_value_files
  }

  depends_on = [helm_release.argocd]
}

resource "helm_release" "monitoring" {
  count = var.enable_monitoring ? 1 : 0

  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = "94.1.0"
  namespace        = "monitoring"
  create_namespace = true
  values           = [local.monitoring_values]
  timeout          = 900

  set {
    name  = "prometheus.prometheusSpec.retention"
    value = var.prometheus_retention
  }
}
