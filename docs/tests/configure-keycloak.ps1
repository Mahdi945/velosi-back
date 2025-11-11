# Script de Configuration Automatique de Keycloak pour ERP Velosi
# Ce script utilise l'API Admin de Keycloak pour configurer le realm, client et rôles

$KEYCLOAK_URL = "http://localhost:8080"
$ADMIN_USERNAME = "admin"
$ADMIN_PASSWORD = "87Eq8384"
$REALM_NAME = "ERP_Velosi"
$CLIENT_ID = "velosi_auth"
$CLIENT_SECRET = "0SW8TshHXXdLEjpsBVCnQ4HvcSBbc2mN"
$FRONTEND_URL = "http://localhost:4200"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Configuration Automatique de Keycloak" -ForegroundColor Cyan
Write-Host "Realm: $REALM_NAME" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour obtenir le token d'administration
function Get-AdminToken {
    Write-Host "[1/6] Obtention du token d'administration..." -ForegroundColor Yellow
    
    $body = @{
        username   = $ADMIN_USERNAME
        password   = $ADMIN_PASSWORD
        grant_type = "password"
        client_id  = "admin-cli"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" `
                                      -Method Post `
                                      -Body $body `
                                      -ContentType "application/x-www-form-urlencoded"
        
        Write-Host "✅ Token obtenu avec succès" -ForegroundColor Green
        return $response.access_token
    }
    catch {
        Write-Host "❌ Erreur lors de l'obtention du token: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "⚠️  Vérifiez que Keycloak est démarré sur $KEYCLOAK_URL" -ForegroundColor Yellow
        exit 1
    }
}

# Fonction pour créer le realm
function Create-Realm {
    param($token)
    
    Write-Host ""
    Write-Host "[2/6] Création du realm '$REALM_NAME'..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type"  = "application/json"
    }
    
    $realmConfig = @{
        realm = $REALM_NAME
        enabled = $true
        displayName = "Velosi ERP System"
        sslRequired = "none"
        registrationAllowed = $false
        loginWithEmailAllowed = $true
        duplicateEmailsAllowed = $false
        resetPasswordAllowed = $true
        editUsernameAllowed = $false
        bruteForceProtected = $true
        
        # Configuration des sessions
        ssoSessionIdleTimeout = 28800  # 8 heures en secondes
        ssoSessionMaxLifespan = 36000  # 10 heures en secondes
        accessTokenLifespan = 3600     # 1 heure
        accessCodeLifespan = 60        # 1 minute
        
        # Autres paramètres
        defaultSignatureAlgorithm = "RS256"
        revokeRefreshToken = $false
        refreshTokenMaxReuse = 0
    }
    
    try {
        # Vérifier si le realm existe déjà
        try {
            $existing = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM_NAME" `
                                          -Method Get `
                                          -Headers $headers
            
            Write-Host "⚠️  Le realm '$REALM_NAME' existe déjà, mise à jour..." -ForegroundColor Yellow
            
            # Mettre à jour le realm
            Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM_NAME" `
                              -Method Put `
                              -Headers $headers `
                              -Body ($realmConfig | ConvertTo-Json -Depth 10)
            
            Write-Host "✅ Realm mis à jour avec succès" -ForegroundColor Green
        }
        catch {
            # Le realm n'existe pas, le créer
            Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms" `
                              -Method Post `
                              -Headers $headers `
                              -Body ($realmConfig | ConvertTo-Json -Depth 10)
            
            Write-Host "✅ Realm créé avec succès" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Erreur lors de la création/mise à jour du realm: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Fonction pour créer le client
function Create-Client {
    param($token)
    
    Write-Host ""
    Write-Host "[3/6] Création du client '$CLIENT_ID'..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type"  = "application/json"
    }
    
    $clientConfig = @{
        clientId = $CLIENT_ID
        name = "Velosi Auth Client"
        description = "Client OAuth2 pour l'application Velosi ERP"
        enabled = $true
        publicClient = $false
        bearerOnly = $false
        standardFlowEnabled = $true
        implicitFlowEnabled = $false
        directAccessGrantsEnabled = $true
        serviceAccountsEnabled = $false
        
        # URLs
        rootUrl = $FRONTEND_URL
        baseUrl = $FRONTEND_URL
        adminUrl = ""
        redirectUris = @("$FRONTEND_URL/*", "http://localhost:4200/*")
        webOrigins = @($FRONTEND_URL, "http://localhost:4200")
        
        # Secret
        secret = $CLIENT_SECRET
        
        # Protocole
        protocol = "openid-connect"
        
        # Paramètres d'authentification
        fullScopeAllowed = $true
        consentRequired = $false
        
        # Timeouts
        attributes = @{
            "access.token.lifespan" = "3600"
            "client.session.idle.timeout" = "28800"
            "client.session.max.lifespan" = "36000"
        }
    }
    
    try {
        # Récupérer tous les clients pour vérifier si celui-ci existe
        $clients = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients" `
                                     -Method Get `
                                     -Headers $headers
        
        $existingClient = $clients | Where-Object { $_.clientId -eq $CLIENT_ID }
        
        if ($existingClient) {
            Write-Host "⚠️  Le client '$CLIENT_ID' existe déjà, mise à jour..." -ForegroundColor Yellow
            
            # Mettre à jour le client
            Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients/$($existingClient.id)" `
                              -Method Put `
                              -Headers $headers `
                              -Body ($clientConfig | ConvertTo-Json -Depth 10)
            
            Write-Host "✅ Client mis à jour avec succès" -ForegroundColor Green
            Write-Host "   Client ID: $CLIENT_ID" -ForegroundColor Gray
            Write-Host "   Client Secret: $CLIENT_SECRET" -ForegroundColor Gray
        }
        else {
            # Créer le client
            Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients" `
                              -Method Post `
                              -Headers $headers `
                              -Body ($clientConfig | ConvertTo-Json -Depth 10)
            
            Write-Host "✅ Client créé avec succès" -ForegroundColor Green
            Write-Host "   Client ID: $CLIENT_ID" -ForegroundColor Gray
            Write-Host "   Client Secret: $CLIENT_SECRET" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "❌ Erreur lors de la création/mise à jour du client: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Fonction pour créer les rôles
function Create-Roles {
    param($token)
    
    Write-Host ""
    Write-Host "[4/6] Création des rôles..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type"  = "application/json"
    }
    
    $roles = @(
        @{
            name = "commercial"
            description = "Rôle pour le personnel commercial"
        },
        @{
            name = "administratif"
            description = "Rôle pour le personnel administratif"
        },
        @{
            name = "chauffeur"
            description = "Rôle pour les chauffeurs"
        },
        @{
            name = "exploitation"
            description = "Rôle pour le personnel d'exploitation"
        },
        @{
            name = "finance"
            description = "Rôle pour le personnel finance/comptabilité"
        },
        @{
            name = "client"
            description = "Rôle pour les clients permanents"
        }
    )
    
    $createdCount = 0
    $updatedCount = 0
    $skippedCount = 0
    
    foreach ($role in $roles) {
        try {
            # Vérifier si le rôle existe
            try {
                $existing = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM_NAME/roles/$($role.name)" `
                                              -Method Get `
                                              -Headers $headers
                
                Write-Host "  ⚠️  Rôle '$($role.name)' existe déjà" -ForegroundColor Yellow
                $skippedCount++
            }
            catch {
                # Le rôle n'existe pas, le créer
                Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM_NAME/roles" `
                                  -Method Post `
                                  -Headers $headers `
                                  -Body ($role | ConvertTo-Json)
                
                Write-Host "  ✅ Rôle '$($role.name)' créé" -ForegroundColor Green
                $createdCount++
            }
        }
        catch {
            Write-Host "  ❌ Erreur pour le rôle '$($role.name)': $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Résumé des rôles:" -ForegroundColor Cyan
    Write-Host "  - Créés: $createdCount" -ForegroundColor Green
    Write-Host "  - Déjà existants: $skippedCount" -ForegroundColor Yellow
    Write-Host "  - Total: $($roles.Count)" -ForegroundColor Cyan
}

# Fonction pour obtenir les statistiques du realm
function Get-RealmStats {
    param($token)
    
    Write-Host ""
    Write-Host "[5/6] Récupération des statistiques..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    try {
        # Compter les utilisateurs
        $users = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users/count" `
                                   -Method Get `
                                   -Headers $headers
        
        # Compter les clients
        $clients = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients" `
                                     -Method Get `
                                     -Headers $headers
        
        # Compter les rôles
        $roles = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM_NAME/roles" `
                                   -Method Get `
                                   -Headers $headers
        
        Write-Host "✅ Statistiques du realm '$REALM_NAME':" -ForegroundColor Green
        Write-Host "   - Utilisateurs: $users" -ForegroundColor Gray
        Write-Host "   - Clients configurés: $($clients.Count)" -ForegroundColor Gray
        Write-Host "   - Rôles: $($roles.Count)" -ForegroundColor Gray
    }
    catch {
        Write-Host "⚠️  Impossible de récupérer les statistiques: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Fonction pour afficher le résumé
function Show-Summary {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "[6/6] Configuration Terminée ✅" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Informations de connexion:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Keycloak Admin Console:" -ForegroundColor White
    Write-Host "  URL: $KEYCLOAK_URL/admin" -ForegroundColor Gray
    Write-Host "  Realm: $REALM_NAME" -ForegroundColor Gray
    Write-Host "  Username: $ADMIN_USERNAME" -ForegroundColor Gray
    Write-Host "  Password: $ADMIN_PASSWORD" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Client OAuth2:" -ForegroundColor White
    Write-Host "  Client ID: $CLIENT_ID" -ForegroundColor Gray
    Write-Host "  Client Secret: $CLIENT_SECRET" -ForegroundColor Gray
    Write-Host "  Redirect URI: $FRONTEND_URL/*" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🎯 Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "  1. Vérifier la configuration dans l'admin console" -ForegroundColor White
    Write-Host "  2. Exécuter la migration: npm run sync:keycloak" -ForegroundColor White
    Write-Host "  3. Tester les endpoints de session management" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 Documentation: KEYCLOAK_IMPLEMENTATION_COMPLETE.md" -ForegroundColor Yellow
    Write-Host ""
}

# Exécution principale
try {
    $token = Get-AdminToken
    Create-Realm -token $token
    Create-Client -token $token
    Create-Roles -token $token
    Get-RealmStats -token $token
    Show-Summary
}
catch {
    Write-Host ""
    Write-Host "❌ Erreur fatale: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}
