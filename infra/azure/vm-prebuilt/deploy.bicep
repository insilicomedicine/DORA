@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Name of the virtual machine to provision.')
param vmName string = 'dora-vm'

@description('Size of the virtual machine.')
param vmSize string = 'Standard_D8s_v5'

@description('Optional public DNS label prefix for the VM public IP. Leave empty to skip DNS registration.')
param dnsLabelPrefix string = ''

@description('Admin username for the Linux VM.')
param adminUsername string

@description('SSH public key for the admin user.')
param adminSshPublicKey string

@description('Azure Container Registry login server, e.g. myregistry.azurecr.io')
param acrLoginServer string

@description('ACR token username used for docker login (token-based auth only; no managed identity).')
param acrTokenUsername string

@secure()
@description('ACR token password (credential value) used for docker login.')
param acrTokenPassword string

@secure()
@description('Django SECRET_KEY value written to the application .env file.')
param secretKey string

@secure()
@description('Optional OpenAI API key if AI features are enabled.')
param openAiApiKey string = ''

@description('OpenAI API type: openai, azure, or custom.')
param openAiApiType string = 'openai'

@description('Optional OpenAI API base URL.')
param openAiApiBaseUrl string = ''

@description('Optional OpenAI API version when using Azure OpenAI.')
param openAiApiVersion string = ''

@description('Optional OpenAI deployment name when using Azure OpenAI.')
param openAiDeploymentName string = ''

@description('Independent JSON array string for embedding model configurations (NOT auto-derived from the generic OpenAI params). Provide per‑model credentials if they differ. Example: [{"model":"text-embedding-3-small","api_key":"<key>","base_url":"https://example.openai.azure.com","version":"2024-10-01-preview","deployment_name":"text-embedding-3-small"}]  Use an empty array [] if you do not configure embeddings yet.')
param embeddingOpenAiApiConfigs string = '[]'

@description('Public base URL for the deployed application (e.g., http://40.114.x.y or http://dora-demo.region.cloudapp.azure.com). If empty, auto-generated from public IP or DNS label.')
param publicBaseUrl string = ''

@minValue(64)
@maxValue(512)
@description('Size in GB of the attached data disk for PostgreSQL, Redis, logs, and static files.')
param dataDiskSizeGB int = 128

@description('Blob container name used by the application for storing uploads and exports.')
param storageContainerName string = 'media'

var vnetName = '${vmName}-vnet'
var subnetName = '${vmName}-subnet'
var nsgName = '${vmName}-nsg'
var publicIpName = '${vmName}-pip'
var nicName = '${vmName}-nic'
var diskName = '${vmName}-data-disk'
var storageAccountName = toLower('dor${uniqueString(resourceGroup().id, vmName)}')
var tags = {
  project: 'dora'
  workload: 'vm-prebuilt'
}

var effectiveStorageContainerName = empty(storageContainerName) ? 'media' : toLower(storageContainerName)
var databaseUrl = 'postgresql://dora:dora@dora_db:5432/dora'
// Extracted registry name no longer required (token auth uses full login server directly)

var cloudInitTemplate = loadTextContent('cloud-init.yaml')

// Compute public base URL early so it can be used in CORS configuration
// Note: This references publicIpAddress.properties which will be resolved at deployment time
var computedPublicBaseUrl = empty(publicBaseUrl) ? (empty(dnsLabelPrefix) ? 'http://${publicIpAddress.properties.ipAddress}' : 'http://${publicIpAddress.properties.dnsSettings.fqdn}') : publicBaseUrl

resource networkSecurityGroup 'Microsoft.Network/networkSecurityGroups@2022-09-01' = {
  name: nsgName
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'AllowSSH'
        properties: {
          priority: 1000
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '22'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
      {
        name: 'AllowHTTP'
        properties: {
          priority: 1010
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '80'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
    ]
  }
}

resource virtualNetwork 'Microsoft.Network/virtualNetworks@2022-09-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.30.0.0/16'
      ]
    }
    subnets: [
      {
        name: subnetName
        properties: {
          addressPrefix: '10.30.1.0/24'
          networkSecurityGroup: {
            id: networkSecurityGroup.id
          }
        }
      }
    ]
  }
}

resource publicIpAddress 'Microsoft.Network/publicIPAddresses@2022-09-01' = {
  name: publicIpName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
    publicIPAddressVersion: 'IPv4'
    dnsSettings: empty(dnsLabelPrefix) ? null : {
      domainNameLabel: dnsLabelPrefix
    }
  }
}

resource networkInterface 'Microsoft.Network/networkInterfaces@2022-09-01' = {
  name: nicName
  location: location
  tags: tags
  properties: {
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, subnetName)
          }
          publicIPAddress: {
            id: publicIpAddress.id
          }
        }
      }
    ]
  }
}

resource dataDisk 'Microsoft.Compute/disks@2022-07-02' = {
  name: diskName
  location: location
  tags: tags
  sku: {
    name: 'Premium_LRS'
  }
  properties: {
    creationData: {
      createOption: 'Empty'
    }
    diskSizeGB: dataDiskSizeGB
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  name: 'default'
  parent: storageAccount
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: [
            computedPublicBaseUrl
            'http://localhost'
            'http://localhost:80'
          ]
          allowedMethods: [
            'GET'
            'HEAD'
            'POST'
            'PUT'
            'DELETE'
            'OPTIONS'
          ]
          allowedHeaders: [
            '*'
          ]
          exposedHeaders: [
            '*'
          ]
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource storageContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: effectiveStorageContainerName
  parent: blobService
  properties: {
    publicAccess: 'None'
  }
}

var storageAccountKey = storageAccount.listKeys().keys[0].value
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${storageAccountKey};EndpointSuffix=${environment().suffixes.storage}'

var cloudInitWithAcr = replace(cloudInitTemplate, '__ACR_LOGIN_SERVER__', acrLoginServer)
var cloudInitWithSecret = replace(cloudInitWithAcr, '__SECRET_KEY__', secretKey)
var cloudInitWithStorage = replace(cloudInitWithSecret, '__AZURE_STORAGE_CONNECTION_STRING__', storageConnectionString)
var cloudInitWithStorageName = replace(cloudInitWithStorage, '__AZURE_STORAGE_ACCOUNT_NAME__', storageAccountName)
var cloudInitWithContainer = replace(cloudInitWithStorageName, '__AZURE_STORAGE_CONTAINER__', effectiveStorageContainerName)
var cloudInitWithOpenAiKey = replace(cloudInitWithContainer, '__OPENAI_API_KEY__', openAiApiKey)
var cloudInitWithOpenAiType = replace(cloudInitWithOpenAiKey, '__OPENAI_API_TYPE__', openAiApiType)
var cloudInitWithOpenAiBase = replace(cloudInitWithOpenAiType, '__OPENAI_API_BASE_URL__', openAiApiBaseUrl)
var cloudInitWithOpenAiVersion = replace(cloudInitWithOpenAiBase, '__OPENAI_API_VERSION__', openAiApiVersion)
var cloudInitWithOpenAiDeployment = replace(cloudInitWithOpenAiVersion, '__OPENAI_API_DEPLOYMENT_NAME__', openAiDeploymentName)
var cloudInitWithAdmin = replace(cloudInitWithOpenAiDeployment, '__ADMIN_USERNAME__', adminUsername)
var cloudInitWithEmbedding = replace(cloudInitWithAdmin, '__EMBEDDING_OPENAI_API_CONFIGS__', embeddingOpenAiApiConfigs)
var cloudInitWithAcrTokenUser = replace(cloudInitWithEmbedding, '__ACR_TOKEN_USERNAME__', acrTokenUsername)
var cloudInitWithAcrTokenPass = replace(cloudInitWithAcrTokenUser, '__ACR_TOKEN_PASSWORD__', acrTokenPassword)
var cloudInitWithPublicUrl = replace(cloudInitWithAcrTokenPass, '__PUBLIC_BASE_URL__', computedPublicBaseUrl)
var cloudInitFinal = replace(cloudInitWithPublicUrl, '__DATABASE_URL__', databaseUrl)

resource virtualMachine 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  name: vmName
  location: location
  tags: tags
  properties: {
    hardwareProfile: {
      vmSize: vmSize
    }
    osProfile: {
      computerName: vmName
      adminUsername: adminUsername
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [
            {
              path: '/home/${adminUsername}/.ssh/authorized_keys'
              keyData: adminSshPublicKey
            }
          ]
        }
      }
      customData: base64(cloudInitFinal)
    }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: '0001-com-ubuntu-server-jammy'
        sku: '22_04-lts'
        version: 'latest'
      }
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: 'Premium_LRS'
        }
      }
      dataDisks: [
        {
          lun: 0
          createOption: 'Attach'
          managedDisk: {
            id: dataDisk.id
          }
        }
      ]
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: networkInterface.id
        }
      ]
    }
    diagnosticsProfile: {
      bootDiagnostics: {
        enabled: true
        storageUri: 'https://${storageAccountName}.blob.${environment().suffixes.storage}/'
      }
    }
  }
}

// ACR existing reference removed (token auth does not require ARM interaction)

// Managed identity & role assignment removed: token-only ACR auth

output vmNameOut string = vmName
output vmResourceId string = virtualMachine.id
output publicIpAddress string = publicIpAddress.properties.ipAddress
output dnsLabel string = empty(dnsLabelPrefix) ? '' : '${dnsLabelPrefix}.${toLower(location)}.cloudapp.azure.com'
output storageAccountNameOut string = storageAccountName
@secure()
output storageConnectionStringOut string = storageConnectionString
output storageContainerNameOut string = effectiveStorageContainerName
output acrAuthMode string = 'token'
