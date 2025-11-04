# Script pour ajouter les permissions au Service Account Keycloak
# Date: 4 novembre 2025

$KEYCLOAK_URL = "http://localhost:8080"
$ADMIN_USER = "admin"
$ADMIN_PASSWORD = "87Eq8384"
$REALM = "ERP_Velosi"
$CLIENT_ID = "velosi_auth"

Write-Host "🔐 Obtention du token admin..." -ForegroundColor Cyan

# Obtenir le token admin
$tokenResponse = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" `
    -Method Post `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        grant_type = "password"
        client_id = "admin-cli"
        username = $ADMIN_USER
        password = $ADMIN_PASSWORD
    }

$TOKEN = $tokenResponse.access_token
Write-Host "✅ Token obtenu" -ForegroundColor Green

# Headers avec le token
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "`n📋 Recherche du client velosi_auth..." -ForegroundColor Cyan

# Récupérer l'ID du client velosi_auth
$clients = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=$CLIENT_ID" `
    -Method Get `
    -Headers $headers

$clientUUID = $clients[0].id
Write-Host "✅ Client trouvé: $clientUUID" -ForegroundColor Green

Write-Host "`n📋 Recherche du service account user..." -ForegroundColor Cyan

# Récupérer l'utilisateur service account
$serviceAccountUser = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/clients/$clientUUID/service-account-user" `
    -Method Get `
    -Headers $headers

$serviceAccountUserId = $serviceAccountUser.id
Write-Host "✅ Service Account User ID: $serviceAccountUserId" -ForegroundColor Green

Write-Host "`n📋 Recherche du client realm-management..." -ForegroundColor Cyan

# Récupérer l'ID du client realm-management
$realmManagementClients = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=realm-management" `
    -Method Get `
    -Headers $headers

$realmManagementId = $realmManagementClients[0].id
Write-Host "✅ Realm Management Client ID: $realmManagementId" -ForegroundColor Green

Write-Host "`n📋 Récupération des rôles disponibles..." -ForegroundColor Cyan

# Récupérer les rôles disponibles du client realm-management
$availableRoles = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$serviceAccountUserId/role-mappings/clients/$realmManagementId/available" `
    -Method Get `
    -Headers $headers

# Filtrer les rôles nécessaires
$requiredRoleNames = @("manage-users", "view-users", "manage-clients", "view-realm")
$rolesToAssign = $availableRoles | Where-Object { $requiredRoleNames -contains $_.name }

Write-Host "✅ Rôles trouvés: $($rolesToAssign.Count)" -ForegroundColor Green
foreach ($role in $rolesToAssign) {
    Write-Host "   - $($role.name)" -ForegroundColor Yellow
}

Write-Host "`n🔧 Attribution des rôles au service account..." -ForegroundColor Cyan

# Assigner les rôles
$assignResponse = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$serviceAccountUserId/role-mappings/clients/$realmManagementId" `
    -Method Post `
    -Headers $headers `
    -Body ($rolesToAssign | ConvertTo-Json -Depth 10)

Write-Host "✅ Rôles assignés avec succès!" -ForegroundColor Green

Write-Host "`n📊 Vérification des rôles effectifs..." -ForegroundColor Cyan

# Vérifier les rôles assignés
$effectiveRoles = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$serviceAccountUserId/role-mappings/clients/$realmManagementId" `
    -Method Get `
    -Headers $headers

Write-Host "`n✅ RÔLES ACTUELLEMENT ASSIGNÉS:" -ForegroundColor Green
foreach ($role in $effectiveRoles) {
    Write-Host "   ✓ $($role.name)" -ForegroundColor Green
}

Write-Host "`n🎉 Configuration terminée!" -ForegroundColor Green
Write-Host "Vous pouvez maintenant relancer: npm run sync:keycloak" -ForegroundColor Yellow
