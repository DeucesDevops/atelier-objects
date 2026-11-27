output "argocd_namespace" {
  description = "Namespace where Argo CD is installed."
  value       = helm_release.argocd.namespace
}

output "monitoring_namespace" {
  description = "Namespace where kube-prometheus-stack is installed, when monitoring is enabled."
  value       = var.enable_monitoring ? helm_release.monitoring[0].namespace : null
}
