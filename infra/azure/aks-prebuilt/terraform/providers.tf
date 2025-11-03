# Terraform Provider Configuration for DORA AKS Deployment
# This file defines the required Terraform and provider versions

terraform {
  required_version = ">=1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "azurerm" {
  # Subscription ID can be set in two ways (priority order):
  # 1. Set in terraform.tfvars: subscription_id = "xxx-xxx-xxx"
  # 2. Set environment variable: export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
  subscription_id = var.subscription_id != "" ? var.subscription_id : null
  
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
  }
}
