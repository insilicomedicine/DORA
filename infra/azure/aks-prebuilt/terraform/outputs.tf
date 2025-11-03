# Outputs for DORA AKS Deployment

output "resource_group_name" {
  description = "Name of the resource group"
  value       = local.resource_group_name
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_id" {
  description = "ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.id
}

output "aks_kubeconfig_command" {
  description = "Command to get kubeconfig for AKS cluster"
  value       = "az aks get-credentials --resource-group ${local.resource_group_name} --name ${azurerm_kubernetes_cluster.main.name}"
}

output "postgres_fqdn" {
  description = "FQDN of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgres_admin_username" {
  description = "Admin username for PostgreSQL"
  value       = var.postgres_admin_username
  sensitive   = true
}

output "postgres_admin_password" {
  description = "Admin password for PostgreSQL"
  value       = var.postgres_admin_password != "" ? var.postgres_admin_password : random_password.postgres_password.result
  sensitive   = true
}

output "postgres_database_name" {
  description = "Name of the PostgreSQL database"
  value       = azurerm_postgresql_flexible_server_database.main.name
}

output "postgres_connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${var.postgres_admin_username}:${var.postgres_admin_password != "" ? var.postgres_admin_password : random_password.postgres_password.result}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${azurerm_postgresql_flexible_server_database.main.name}?sslmode=require"
  sensitive   = true
}

output "redis_hostname" {
  description = "Hostname of the Redis cache"
  value       = azurerm_redis_cache.main.hostname
}

output "redis_port" {
  description = "TLS port of the Redis cache"
  value       = 6380
}

output "redis_primary_key" {
  description = "Primary access key for Redis cache"
  value       = azurerm_redis_cache.main.primary_access_key
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis cache connection string base (without db number) - Using non-SSL for compatibility"
  value       = "redis://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:6379"
  sensitive   = true
}

output "redis_private_endpoint_ip" {
  description = "Private endpoint IP for Redis cache"
  value       = azurerm_private_endpoint.redis_cache.private_service_connection[0].private_ip_address
}

output "redis_privatelink_fqdn" {
  description = "Private link FQDN for Redis cache"
  value       = "${azurerm_redis_cache.main.name}.privatelink.redis.cache.windows.net"
}
output "redis_cache_db" {
  description = "Redis DB index for default cache (DB 0)"
  value       = "0"
}

output "redis_broker_db" {
  description = "Redis DB index for Celery broker/result backend (DB 1)"
  value       = "1"
}

output "redis_channels_db" {
  description = "Redis DB index for Django Channels layer (DB 2)"
  value       = "2"
}

output "redis_chunks_db" {
  description = "Redis DB index for document chunks cache (DB 3)"
  value       = "3"
}

output "redis_webchunks_db" {
  description = "Redis DB index for web chunks cache (DB 4)"
  value       = "4"
}


output "ingress_public_ip" {
  description = "Public IP address for ingress"
  value       = azurerm_public_ip.ingress.ip_address
}

output "ingress_fqdn" {
  description = "FQDN for ingress"
  value       = azurerm_public_ip.ingress.fqdn
}

output "django_secret_key" {
  description = "Generated Django secret key"
  value       = var.django_secret_key != "" ? var.django_secret_key : random_password.django_secret.result
  sensitive   = true
}

output "helm_values_file" {
  description = "Path to generated Helm values file"
  value       = "${path.module}/../helm/generated-values.yaml"
}

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "storage_account_name" {
  description = "Name of the Storage Account"
  value       = azurerm_storage_account.main.name
}

output "storage_account_primary_key" {
  description = "Primary access key for Storage Account"
  value       = azurerm_storage_account.main.primary_access_key
  sensitive   = true
}

output "storage_connection_string" {
  description = "Connection string for Storage Account"
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true
}

output "storage_container_name" {
  description = "Name of the blob container for media files"
  value       = azurerm_storage_container.media.name
}

# OpenAI Configuration Outputs
output "openai_api_key" {
  description = "OpenAI API Key"
  value       = var.openai_api_key
  sensitive   = true
}

output "openai_api_type" {
  description = "OpenAI API type"
  value       = var.openai_api_type
}

output "openai_api_base_url" {
  description = "OpenAI API base URL"
  value       = var.openai_api_base_url
}

output "openai_api_version" {
  description = "OpenAI API version"
  value       = var.openai_api_version
}

output "openai_deployment_name" {
  description = "OpenAI deployment name"
  value       = var.openai_deployment_name
}

output "embedding_openai_api_configs" {
  description = "Embedding OpenAI API configurations"
  value       = var.embedding_openai_api_configs
  sensitive   = true
}
