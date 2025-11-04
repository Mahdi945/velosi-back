# ============================================
# Script de Vérification Keycloak Railway
# ============================================
# Ce script vérifie que votre Keycloak déployé sur Railway fonctionne correctement

param(
    [Parameter(Mandatory=$true)]
    [string]$KeycloakUrl,
    
    [string]$Realm = "ERP_Velosi",
    [string]$AdminUser = "admin",
    [string]$AdminPassword = "87Eq8384"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 Vérification Keycloak Railway" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Supprimer le slash final si présent
$KeycloakUrl = $KeycloakUrl.TrimEnd('/')

Write-Host "📍 URL Keycloak : $KeycloakUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1 : Vérifier que l'URL est accessible
Write-Host "Test 1/6 : Vérification de l'accessibilité..." -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri $KeycloakUrl -Method GET -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Keycloak est accessible !" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ ERREUR : Keycloak n'est pas accessible" -ForegroundColor Red
    Write-Host "   Détails : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solutions :" -ForegroundColor Yellow
    Write-Host "   1. Vérifiez que le déploiement Railway est terminé" -ForegroundColor Yellow
    Write-Host "   2. Vérifiez que le domaine a été généré dans Railway" -ForegroundColor Yellow
    Write-Host "   3. Attendez 2-3 minutes et réessayez" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2 : Vérifier le endpoint health
Write-Host "Test 2/6 : Vérification du health check..." -ForegroundColor White
try {
    $healthUrl = "$KeycloakUrl/health/ready"
    $response = Invoke-WebRequest -Uri $healthUrl -Method GET -UseBasicParsing -TimeoutSec 30
    $health = $response.Content | ConvertFrom-Json
    
    if ($health.status -eq "UP") {
        Write-Host "✅ Keycloak est en bonne santé (UP) !" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Keycloak répond mais status : $($health.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Health check non disponible (normal si Keycloak vient de démarrer)" -ForegroundColor Yellow
}

Write-Host ""

# Test 3 : Vérifier le endpoint admin console
Write-Host "Test 3/6 : Vérification de l'admin console..." -ForegroundColor White
try {
    $adminUrl = "$KeycloakUrl/admin"
    $response = Invoke-WebRequest -Uri $adminUrl -Method GET -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Admin console accessible !" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ ERREUR : Admin console non accessible" -ForegroundColor Red
    Write-Host "   URL testée : $adminUrl" -ForegroundColor Red
}

Write-Host ""

# Test 4 : Vérifier la configuration OpenID Connect
Write-Host "Test 4/6 : Vérification de la configuration OpenID..." -ForegroundColor White
try {
    $oidcUrl = "$KeycloakUrl/realms/master/.well-known/openid-configuration"
    $response = Invoke-WebRequest -Uri $oidcUrl -Method GET -UseBasicParsing -TimeoutSec 30
    $oidc = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Configuration OpenID disponible !" -ForegroundColor Green
    Write-Host "   Issuer : $($oidc.issuer)" -ForegroundColor Gray
    Write-Host "   Token endpoint : $($oidc.token_endpoint)" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERREUR : Configuration OpenID non disponible" -ForegroundColor Red
}

Write-Host ""

# Test 5 : Tester l'authentification admin
Write-Host "Test 5/6 : Test d'authentification admin..." -ForegroundColor White
try {
    $tokenUrl = "$KeycloakUrl/realms/master/protocol/openid-connect/token"
    $body = @{
        username = $AdminUser
        password = $AdminPassword
        grant_type = "password"
        client_id = "admin-cli"
    }
    
    $response = Invoke-RestMethod -Uri $tokenUrl -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
    
    if ($response.access_token) {
        Write-Host "✅ Authentification admin réussie !" -ForegroundColor Green
        Write-Host "   Token reçu (valide $($response.expires_in) secondes)" -ForegroundColor Gray
        
        # Sauvegarder le token pour le test suivant
        $script:AdminToken = $response.access_token
    }
} catch {
    Write-Host "❌ ERREUR : Échec de l'authentification admin" -ForegroundColor Red
    Write-Host "   Vérifiez le username et password" -ForegroundColor Red
    Write-Host "   Username : $AdminUser" -ForegroundColor Red
}

Write-Host ""

# Test 6 : Vérifier si le realm existe
Write-Host "Test 6/6 : Vérification du realm '$Realm'..." -ForegroundColor White
try {
    if ($script:AdminToken) {
        $realmUrl = "$KeycloakUrl/admin/realms/$Realm"
        $headers = @{
            Authorization = "Bearer $($script:AdminToken)"
        }
        
        $response = Invoke-RestMethod -Uri $realmUrl -Method GET -Headers $headers
        Write-Host "✅ Realm '$Realm' existe !" -ForegroundColor Green
        Write-Host "   Enabled : $($response.enabled)" -ForegroundColor Gray
        Write-Host "   Display Name : $($response.displayName)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Impossible de vérifier le realm (pas de token admin)" -ForegroundColor Yellow
        Write-Host "💡 Créez le realm manuellement dans l'interface web" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "⚠️ Realm '$Realm' n'existe pas encore" -ForegroundColor Yellow
        Write-Host "💡 Créez-le manuellement dans l'interface web :" -ForegroundColor Yellow
        Write-Host "   1. Allez sur $KeycloakUrl/admin" -ForegroundColor Cyan
        Write-Host "   2. Connectez-vous avec admin / $AdminPassword" -ForegroundColor Cyan
        Write-Host "   3. Cliquez sur 'Create Realm'" -ForegroundColor Cyan
        Write-Host "   4. Nom : $Realm" -ForegroundColor Cyan
    } else {
        Write-Host "❌ ERREUR lors de la vérification du realm" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 URLs importantes :" -ForegroundColor White
Write-Host "   Admin Console : $KeycloakUrl/admin" -ForegroundColor Cyan
Write-Host "   OpenID Config : $KeycloakUrl/realms/$Realm/.well-known/openid-configuration" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Prochaines étapes :" -ForegroundColor White
Write-Host "   1. Créez le realm '$Realm' si ce n'est pas fait" -ForegroundColor Yellow
Write-Host "   2. Créez le client 'velosi_auth'" -ForegroundColor Yellow
Write-Host "   3. Récupérez le client secret" -ForegroundColor Yellow
Write-Host "   4. Mettez à jour votre .env.production avec :" -ForegroundColor Yellow
Write-Host "      KEYCLOAK_URL=$KeycloakUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Vérification terminée !" -ForegroundColor Green
Write-Host ""
