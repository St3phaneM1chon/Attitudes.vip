// Attitudes.vip - Azure Infrastructure as Code (Bicep)
// Wedding Management SaaS Platform
// Resources: App Service + PostgreSQL + Redis + Key Vault + App Insights

@description('Environment name')
@allowed(['prod', 'staging', 'dev'])
param environment string = 'prod'

@description('Azure region')
param location string = resourceGroup().location

@description('Application name')
param appName string = 'attitudes-vip'

@description('PostgreSQL admin username')
param dbAdminUser string = 'attitudesadmin'

@secure()
@description('PostgreSQL admin password')
param dbAdminPassword string

@secure()
@description('JWT secret key')
param jwtSecret string

@description('Azure AD Tenant ID (optional)')
param azureAdTenantId string = ''

@description('Azure AD Client ID (optional)')
param azureAdClientId string = ''

// ============================================================
// VARIABLES
// ============================================================

var suffix = environment == 'prod' ? '' : '-${environment}'
var resourcePrefix = '${appName}${suffix}'
var tags = {
  project: 'attitudes-vip'
  environment: environment
  managedBy: 'bicep'
}

// Tier mapping per environment
var appServiceSkuName = environment == 'prod' ? 'P1v3' : 'B1'
var dbSkuName = environment == 'prod' ? 'Standard_B2s' : 'Standard_B1ms'
var dbStorageSizeGB = environment == 'prod' ? 64 : 32
var redisSku = environment == 'prod' ? 'Standard' : 'Basic'
var redisCapacity = environment == 'prod' ? 1 : 0

// ============================================================
// LOG ANALYTICS WORKSPACE
// ============================================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${resourcePrefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 90
  }
}

// ============================================================
// APPLICATION INSIGHTS
// ============================================================

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${resourcePrefix}-insights'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    RetentionInDays: 90
  }
}

// ============================================================
// KEY VAULT
// ============================================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${resourcePrefix}-kv'
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Store secrets in Key Vault
resource kvSecretJwt 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'jwt-secret'
  properties: {
    value: jwtSecret
  }
}

resource kvSecretDbPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'db-admin-password'
  properties: {
    value: dbAdminPassword
  }
}

// ============================================================
// POSTGRESQL FLEXIBLE SERVER
// ============================================================

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: '${resourcePrefix}-db'
  location: location
  tags: tags
  sku: {
    name: dbSkuName
    tier: 'Burstable'
  }
  properties: {
    version: '15'
    administratorLogin: dbAdminUser
    administratorLoginPassword: dbAdminPassword
    storage: {
      storageSizeGB: dbStorageSizeGB
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: 'attitudes_vip'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ============================================================
// AZURE CACHE FOR REDIS
// ============================================================

resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${resourcePrefix}-redis'
  location: location
  tags: tags
  properties: {
    sku: {
      name: redisSku
      family: redisSku == 'Basic' ? 'C' : 'C'
      capacity: redisCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

// ============================================================
// APP SERVICE PLAN
// ============================================================

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${resourcePrefix}-plan'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: appServiceSkuName
  }
  properties: {
    reserved: true
  }
}

// ============================================================
// WEB APP (App Service)
// ============================================================

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: resourcePrefix
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      alwaysOn: environment == 'prod'
      healthCheckPath: '/api/v1/health'
      appSettings: [
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~20' }
        { name: 'NODE_ENV', value: environment == 'prod' ? 'production' : environment }
        { name: 'PORT', value: '3000' }
        { name: 'DATABASE_URL', value: 'postgresql://${dbAdminUser}:${dbAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/attitudes_vip?sslmode=require' }
        { name: 'REDIS_URL', value: 'rediss://:${redisCache.listKeys().primaryKey}@${redisCache.properties.hostName}:${redisCache.properties.sslPort}' }
        { name: 'JWT_SECRET', value: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=jwt-secret)' }
        { name: 'AZURE_KEY_VAULT_URL', value: keyVault.properties.vaultUri }
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY', value: appInsights.properties.InstrumentationKey }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
      ]
    }
  }
}

// Key Vault access for Web App
resource kvAccessPolicy 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webApp.id, '4633458b-17de-408a-b874-0445c86b69e6')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// ============================================================
// STAGING SLOT (Production only)
// ============================================================

resource stagingSlot 'Microsoft.Web/sites/slots@2023-12-01' = if (environment == 'prod') {
  parent: webApp
  name: 'staging'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      healthCheckPath: '/api/v1/health'
    }
  }
}

// ============================================================
// OUTPUTS
// ============================================================

output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppName string = webApp.name
output keyVaultUri string = keyVault.properties.vaultUri
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output postgresHost string = postgresServer.properties.fullyQualifiedDomainName
output redisHost string = redisCache.properties.hostName
output resourceGroupName string = resourceGroup().name
