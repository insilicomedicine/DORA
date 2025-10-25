@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Name of the virtual machine to provision.')
param vmName string = 'dora-vm'

@description('Size of the virtual machine.')
param vmSize string = 'Standard_D8s_v5'

@description('DNS label prefix for the VM public IP. Defaults to VM name. The FQDN will be <prefix>.<region>.cloudapp.azure.com')
param dnsLabelPrefix string = vmName

@description('Admin username for the Linux VM.')
param adminUsername string

@description('SSH public key for the admin user.')
param adminSshPublicKey string

@description('Container image source: acr (Azure Container Registry) or dockerhub (Docker Hub insilicomed)')
@allowed([
  'acr'
  'dockerhub'
])
param imageSource string = 'dockerhub'

@description('Azure Container Registry login server (required if imageSource=acr), e.g. myregistry.azurecr.io')
param acrLoginServer string = ''

@description('Container registry username (ACR token username or Docker Hub username)')
param registryUsername string

@secure()
@description('Container registry password (ACR token password or Docker Hub password/token)')
param registryPassword string

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

@minValue(64)
@maxValue(2048)
@description('Size in GB of the attached data disk for PostgreSQL, Redis, logs, and static files. Should match Premium SSD tiers: 64(P6), 128(P10), 256(P15), 512(P20), 1024(P30), 2048(P40).')
param dataDiskSizeGB int = 128

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

var databaseUrl = 'postgresql://dora:dora@dora_db:5432/dora'

// Auto-generate Django SECRET_KEY using unique string based on resource group and VM name
var generatedSecretKey = uniqueString(resourceGroup().id, vmName, 'django-secret-key-salt-2025')

// Container registry configuration based on image source
var registryServer = imageSource == 'dockerhub' ? 'docker.io' : acrLoginServer
var backendImage = imageSource == 'dockerhub' ? 'insilicomed/dora-backend:blob' : '${acrLoginServer}/dora-backend:latest'
var frontendImage = imageSource == 'dockerhub' ? 'insilicomed/dora-frontend:blob' : '${acrLoginServer}/dora-frontend:latest'

var cloudInitTemplate = loadTextContent('cloud-init.yaml')

// Compute public base URL from DNS FQDN (dnsLabelPrefix defaults to vmName)
// Note: This references publicIpAddress.properties which will be resolved at deployment time
var computedPublicBaseUrl = 'http://${publicIpAddress.properties.dnsSettings.fqdn}'

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
    dnsSettings: {
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
  name: 'media'
  parent: blobService
  properties: {
    publicAccess: 'None'
  }
}

var storageAccountKey = storageAccount.listKeys().keys[0].value
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${storageAccountKey};EndpointSuffix=${environment().suffixes.storage}'

var cloudInitWithRegistry = replace(cloudInitTemplate, '__REGISTRY_SERVER__', registryServer)
var cloudInitWithBackendImage = replace(cloudInitWithRegistry, '__BACKEND_IMAGE__', backendImage)
var cloudInitWithFrontendImage = replace(cloudInitWithBackendImage, '__FRONTEND_IMAGE__', frontendImage)
var cloudInitWithSecret = replace(cloudInitWithFrontendImage, '__SECRET_KEY__', generatedSecretKey)
var cloudInitWithStorage = replace(cloudInitWithSecret, '__AZURE_STORAGE_CONNECTION_STRING__', storageConnectionString)
var cloudInitWithStorageName = replace(cloudInitWithStorage, '__AZURE_STORAGE_ACCOUNT_NAME__', storageAccountName)
var cloudInitWithContainer = replace(cloudInitWithStorageName, '__AZURE_STORAGE_CONTAINER__', 'media')
var cloudInitWithOpenAiKey = replace(cloudInitWithContainer, '__OPENAI_API_KEY__', openAiApiKey)
var cloudInitWithOpenAiType = replace(cloudInitWithOpenAiKey, '__OPENAI_API_TYPE__', openAiApiType)
var cloudInitWithOpenAiBase = replace(cloudInitWithOpenAiType, '__OPENAI_API_BASE_URL__', openAiApiBaseUrl)
var cloudInitWithOpenAiVersion = replace(cloudInitWithOpenAiBase, '__OPENAI_API_VERSION__', openAiApiVersion)
var cloudInitWithOpenAiDeployment = replace(cloudInitWithOpenAiVersion, '__OPENAI_API_DEPLOYMENT_NAME__', openAiDeploymentName)
var cloudInitWithAdmin = replace(cloudInitWithOpenAiDeployment, '__ADMIN_USERNAME__', adminUsername)
var cloudInitWithEmbedding = replace(cloudInitWithAdmin, '__EMBEDDING_OPENAI_API_CONFIGS__', embeddingOpenAiApiConfigs)
var cloudInitWithRegistryUser = replace(cloudInitWithEmbedding, '__REGISTRY_USERNAME__', registryUsername)
var cloudInitWithRegistryPass = replace(cloudInitWithRegistryUser, '__REGISTRY_PASSWORD__', registryPassword)
var cloudInitWithPublicUrl = replace(cloudInitWithRegistryPass, '__PUBLIC_BASE_URL__', computedPublicBaseUrl)
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

output vmNameOut string = vmName
output vmResourceId string = virtualMachine.id
output publicIpAddress string = publicIpAddress.properties.ipAddress
output fqdn string = '${dnsLabelPrefix}.${toLower(location)}.cloudapp.azure.com'
output storageAccountNameOut string = storageAccountName
@secure()
output storageConnectionStringOut string = storageConnectionString
output storageContainerNameOut string = 'media'
output imageSource string = imageSource
output registryServer string = registryServer
