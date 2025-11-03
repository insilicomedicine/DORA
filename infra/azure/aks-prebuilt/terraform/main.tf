# Main Terraform Configuration for DORA AKS Deployment
# This file creates:
# - Resource Group
# - Virtual Network and Subnets
# - AKS Cluster
# - Azure PostgreSQL Flexible Server
# - Azure Managed Redis
# - Supporting resources (Network Security Groups, etc.)

# Generate random values for sensitive data if not provided
resource "random_password" "postgres_password" {
  length  = 32
  special = true
}

resource "random_password" "django_secret" {
  length  = 50
  special = true
}

resource "random_pet" "name_prefix" {
  prefix = var.cluster_name
  length = 1
}

# Use existing Resource Group (not managed by Terraform)
# The resource group should exist before running Terraform
data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

# Locals to reference the resource group
locals {
  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${var.cluster_name}-vnet"
  location            = local.location
  resource_group_name = local.resource_group_name
  address_space       = ["10.0.0.0/16"]
  tags                = var.tags
}

# Subnet for AKS
resource "azurerm_subnet" "aks" {
  name                 = "${var.cluster_name}-aks-subnet"
  resource_group_name  = local.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Subnet for PostgreSQL (requires delegation)
resource "azurerm_subnet" "postgres" {
  name                 = "${var.cluster_name}-postgres-subnet"
  resource_group_name  = local.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]

  # Explicitly set service_endpoints to prevent drift
  # Note: Not strictly required for PostgreSQL Flexible Server with delegation,
  # but preserves existing Azure state if previously configured
  service_endpoints = []

  delegation {
    name = "postgres-delegation"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# Subnet for Redis Private Endpoint
resource "azurerm_subnet" "redis" {
  name                 = "${var.cluster_name}-redis-subnet"
  resource_group_name  = local.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.3.0/24"]
}

# Private DNS Zone for PostgreSQL
# Note: Zone name must be the standard suffix, NOT include server name
resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = local.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "${var.cluster_name}-postgres-vnet-link"
  resource_group_name   = local.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id
  tags                  = var.tags
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = local.location
  resource_group_name = local.resource_group_name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version
  
  # Custom node resource group - use this when user has limited permissions
  # If not specified, Azure will create MC_<resourcegroup>_<clustername>_<location>
  node_resource_group = var.node_resource_group_name != "" ? var.node_resource_group_name : null

  default_node_pool {
    name                 = "default"
    vm_size              = var.node_vm_size
    vnet_subnet_id       = azurerm_subnet.aks.id
    auto_scaling_enabled = true
    min_count            = var.node_count
    max_count            = var.node_count + 3
    os_disk_size_gb      = 128
    type                 = "VirtualMachineScaleSets"

    # Explicitly define upgrade settings to prevent drift
    upgrade_settings {
      drain_timeout_in_minutes      = 0
      max_surge                     = "10%"
      node_soak_duration_in_minutes = 0
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
    service_cidr      = "10.1.0.0/16"
    dns_service_ip    = "10.1.0.10"
  }

  # Enable HTTP application routing for easy ingress setup
  http_application_routing_enabled = false

  # Enable Azure Monitor
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  # Enable Azure Policy (optional)
  azure_policy_enabled = var.enable_azure_policy

  tags = var.tags
}

# Log Analytics Workspace for AKS monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.cluster_name}-logs"
  location            = local.location
  resource_group_name = local.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                = "${var.cluster_name}-postgres"
  location            = local.location
  resource_group_name = local.resource_group_name

  administrator_login    = var.postgres_admin_username
  administrator_password = var.postgres_admin_password != "" ? var.postgres_admin_password : random_password.postgres_password.result

  sku_name   = var.postgres_sku_name
  version    = var.postgres_version
  storage_mb = var.postgres_storage_mb

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  # Private access via delegated subnet (not accessible from internet)
  delegated_subnet_id          = azurerm_subnet.postgres.id
  private_dns_zone_id          = azurerm_private_dns_zone.postgres.id
  public_network_access_enabled = false

  # Enable pgvector extension
  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]

  # Ignore zone changes to avoid conflicts with existing resources
  lifecycle {
    ignore_changes = [zone]
  }

  tags = var.tags
}

# PostgreSQL Database
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = var.postgres_database_name
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

# PostgreSQL Configuration for pgvector
resource "azurerm_postgresql_flexible_server_configuration" "azure_extensions" {
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "vector"
}


# ---------------------------------------------------------------------------
# Non-cluster Azure Cache for Redis (standard tier) for Celery compatibility
# Celery does not fully support Redis Cluster multi-key pipeline semantics.
# This replaces the previous Azure Managed Redis Enterprise instance.
# ---------------------------------------------------------------------------
resource "azurerm_redis_cache" "main" {
  name                = "${var.cluster_name}-cache"
  location            = local.location
  resource_group_name = local.resource_group_name
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku_name
  minimum_tls_version = "1.2"
  
  # Enable non-SSL port (6379) for applications that don't support Redis SSL
  # SSL port (6380) remains available for apps that support it
  non_ssl_port_enabled = true

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Private Endpoint + Private DNS for Azure Cache for Redis
# Domain for privatelink: privatelink.redis.cache.windows.net
# ---------------------------------------------------------------------------
resource "azurerm_private_dns_zone" "redis_cache" {
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = local.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "redis_cache" {
  name                  = "${var.cluster_name}-rediscache-dns-link"
  resource_group_name   = local.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.redis_cache.name
  virtual_network_id    = azurerm_virtual_network.main.id
  tags                  = var.tags
}

resource "azurerm_private_endpoint" "redis_cache" {
  name                = "${var.cluster_name}-rediscache-pe"
  location            = local.location
  resource_group_name = local.resource_group_name
  subnet_id           = azurerm_subnet.redis.id

  private_service_connection {
    name                           = "${var.cluster_name}-rediscache-psc"
    private_connection_resource_id = azurerm_redis_cache.main.id
    is_manual_connection           = false
    subresource_names              = ["redisCache"]
  }

  tags = var.tags

  depends_on = [
    azurerm_private_dns_zone_virtual_network_link.redis_cache
  ]
}

resource "azurerm_private_dns_a_record" "redis_cache" {
  name                = azurerm_redis_cache.main.name
  zone_name           = azurerm_private_dns_zone.redis_cache.name
  resource_group_name = local.resource_group_name
  ttl                 = 300
  records             = [azurerm_private_endpoint.redis_cache.private_service_connection[0].private_ip_address]
  tags                = var.tags

  depends_on = [
    azurerm_private_endpoint.redis_cache
  ]
}

# Public IP for Ingress Controller (optional)
resource "azurerm_public_ip" "ingress" {
  name                = "${var.cluster_name}-ingress-pip"
  location            = local.location
  resource_group_name = azurerm_kubernetes_cluster.main.node_resource_group
  allocation_method   = "Static"
  sku                 = "Standard"

  domain_name_label = var.dns_label_prefix != "" ? var.dns_label_prefix : var.cluster_name

  tags = var.tags

  depends_on = [azurerm_kubernetes_cluster.main]
}

# Storage Account for media files
resource "azurerm_storage_account" "main" {
  name                     = replace("${var.cluster_name}storage", "-", "")
  location                 = local.location
  resource_group_name      = local.resource_group_name
  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_account_replication
  account_kind             = "StorageV2"

  # Enable HTTPS only
  https_traffic_only_enabled = true
  min_tls_version            = "TLS1_2"

  # Enable blob versioning for data protection
  blob_properties {
    versioning_enabled = true
    
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "POST", "PUT", "DELETE"]
      allowed_origins    = ["*"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }

  tags = var.tags
}

# Storage Container for media files
resource "azurerm_storage_container" "media" {
  name                  = var.storage_container_name
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}
