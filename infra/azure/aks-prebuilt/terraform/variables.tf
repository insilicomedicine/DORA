# Variables for DORA AKS Deployment

# Azure Authentication
variable "subscription_id" {
  description = "Azure Subscription ID. Can also be set via ARM_SUBSCRIPTION_ID environment variable."
  type        = string
  default     = ""
}

variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
  default     = "dora-aks-rg"
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus"
}

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
  default     = "dora-aks"
}

variable "node_resource_group_name" {
  description = "Custom name for the AKS node resource group. If empty, Azure will auto-generate the name (MC_*). Use this when user has limited permissions and needs a pre-created resource group."
  type        = string
  default     = ""
}

variable "kubernetes_version" {
  description = "Kubernetes version for AKS cluster"
  type        = string
  default     = "1.29"
}

variable "node_count" {
  description = "Number of nodes in the default node pool"
  type        = number
  default     = 3
}

variable "node_vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_D4s_v5"
}

# PostgreSQL Variables
variable "postgres_sku_name" {
  description = "SKU for PostgreSQL Flexible Server"
  type        = string
  default     = "GP_Standard_D4s_v3"
}

variable "postgres_storage_mb" {
  description = "Storage size in MB for PostgreSQL"
  type        = number
  default     = 131072 # 128GB
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "16"
}

variable "postgres_admin_username" {
  description = "Admin username for PostgreSQL"
  type        = string
  default     = "doraadmin"
  sensitive   = true
}

variable "postgres_admin_password" {
  description = "Admin password for PostgreSQL (will be generated if not provided)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "postgres_database_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "dora"
}

# Redis Variables
# Azure Cache for Redis (Standard/Premium tier) supports 16 logical databases (0-15)
variable "redis_sku_name" {
  description = "SKU for Azure Cache for Redis (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.redis_sku_name)
    error_message = "redis_sku_name must be one of: Basic, Standard, Premium"
  }
}

variable "redis_family" {
  description = "Redis family (C for Basic/Standard, P for Premium)"
  type        = string
  default     = "C"
  validation {
    condition     = contains(["C", "P"], var.redis_family)
    error_message = "redis_family must be C (Basic/Standard) or P (Premium)"
  }
}

variable "redis_capacity" {
  description = "Redis cache capacity (0-6 for C family, 1-5 for P family)"
  type        = number
  default     = 1
  validation {
    condition     = var.redis_capacity >= 0 && var.redis_capacity <= 6
    error_message = "redis_capacity must be between 0 and 6"
  }
}

# Application Configuration
variable "docker_registry" {
  description = "Docker registry (docker.io or ACR)"
  type        = string
  default     = "docker.io"
}

variable "backend_image" {
  description = "Backend Docker image"
  type        = string
  default     = "insilicomed/dora-backend:latest"
}

variable "frontend_image" {
  description = "Frontend Docker image"
  type        = string
  default     = "insilicomed/dora-frontend:latest"
}

variable "django_secret_key" {
  description = "Django SECRET_KEY (will be generated if not provided)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "openai_api_type" {
  description = "OpenAI API type (openai, azure, custom)"
  type        = string
  default     = "openai"
}

variable "openai_api_base_url" {
  description = "OpenAI API base URL"
  type        = string
  default     = ""
}

variable "openai_api_version" {
  description = "OpenAI API version (for Azure OpenAI)"
  type        = string
  default     = ""
}

variable "openai_deployment_name" {
  description = "OpenAI deployment name (for Azure OpenAI)"
  type        = string
  default     = ""
}

variable "embedding_openai_api_configs" {
  description = "JSON array string for embedding model configurations"
  type        = string
  default     = "[]"
  sensitive   = true
}

variable "storage_account_tier" {
  description = "Performance tier for Storage Account (Standard or Premium)"
  type        = string
  default     = "Standard"
}

variable "storage_account_replication" {
  description = "Replication type for Storage Account (LRS, GRS, RAGRS, ZRS, etc.)"
  type        = string
  default     = "LRS"
}

variable "storage_container_name" {
  description = "Name of the blob container for media files"
  type        = string
  default     = "media"
}

variable "dns_label_prefix" {
  description = "DNS label prefix for the ingress public IP (optional)"
  type        = string
  default     = ""
}

variable "enable_azure_policy" {
  description = "Enable Azure Policy for AKS"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    project   = "dora"
    workload  = "aks-prebuilt"
    managedby = "terraform"
  }
}
