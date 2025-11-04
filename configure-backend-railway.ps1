# ============================================
# Script de Configuration Post-Déploiement Railway
# ============================================
# Ce script met à jour votre backend avec la configuration Keycloak de Railway

param(
    [Parameter(Mandatory=$true, HelpMessage="URL de votre Keycloak Railway (ex: https://keycloak-production-xxxx.up.railway.app)")]
    [string]$KeycloakUrl,
    
    [Parameter(Mandatory=$true, HelpMessage="Client secret du client 'velosi_auth'")]
    [string]$ClientSecret,
    
    [Parameter(Mandatory=$false, HelpMessage="Client secret du client 'admin-cli'")]
    [string]$AdminClientSecret = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Realm = "ERP_Velosi",
    
    [Parameter(Mandatory=$false)]
    [string]$ClientId = "velosi_auth",
    
    [Parameter(Mandatory=$false)]
    [string]$FrontendUrl = "https://votre-frontend.vercel.app"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 Configuration Backend Post-Déploiement" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Supprimer le slash final si présent
$KeycloakUrl = $KeycloakUrl.TrimEnd('/')

# Vérifier que le fichier template existe
$templatePath = ".env.production.keycloak.template"
$outputPath = ".env.production"

if (-not (Test-Path $templatePath)) {
    Write-Host "❌ ERREUR : Le fichier template n'existe pas : $templatePath" -ForegroundColor Red
    Write-Host "   Assurez-vous d'être dans le dossier velosi-back" -ForegroundColor Yellow
    exit 1
}

Write-Host "📄 Lecture du template..." -ForegroundColor White
$content = Get-Content $templatePath -Raw

# Remplacer les valeurs
Write-Host "🔄 Remplacement des valeurs..." -ForegroundColor White

# URLs Keycloak
$content = $content -replace 'KEYCLOAK_URL=https://keycloak-production-xxxx\.up\.railway\.app', "KEYCLOAK_URL=$KeycloakUrl"
$content = $content -replace 'KEYCLOAK_SERVER_URL=https://keycloak-production-xxxx\.up\.railway\.app', "KEYCLOAK_SERVER_URL=$KeycloakUrl"
$content = $content -replace 'KEYCLOAK_AUTH_SERVER_URL=https://keycloak-production-xxxx\.up\.railway\.app', "KEYCLOAK_AUTH_SERVER_URL=$KeycloakUrl"

# Realm et Client
$content = $content -replace 'KEYCLOAK_REALM=ERP_Velosi', "KEYCLOAK_REALM=$Realm"
$content = $content -replace 'KEYCLOAK_CLIENT_ID=velosi_auth', "KEYCLOAK_CLIENT_ID=$ClientId"

# Client Secret
$content = $content -replace 'KEYCLOAK_CLIENT_SECRET=VOTRE_CLIENT_SECRET_ICI', "KEYCLOAK_CLIENT_SECRET=$ClientSecret"

# Admin Client Secret (si fourni)
if ($AdminClientSecret) {
    $content = $content -replace 'KEYCLOAK_ADMIN_CLIENT_SECRET=VOTRE_ADMIN_CLIENT_SECRET_ICI', "KEYCLOAK_ADMIN_CLIENT_SECRET=$AdminClientSecret"
} else {
    Write-Host "⚠️ Admin Client Secret non fourni - à configurer manuellement" -ForegroundColor Yellow
}

# Frontend URL
$content = $content -replace 'FRONTEND_URL=https://votre-frontend\.vercel\.app', "FRONTEND_URL=$FrontendUrl"
$content = $content -replace 'ALLOWED_ORIGINS=https://votre-frontend\.vercel\.app,http://localhost:4200', "ALLOWED_ORIGINS=$FrontendUrl,http://localhost:4200"

# Sauvegarder le fichier
Write-Host "💾 Sauvegarde de .env.production..." -ForegroundColor White
$content | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host "✅ Fichier .env.production créé avec succès !" -ForegroundColor Green
Write-Host ""

# Afficher un résumé
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 CONFIGURATION APPLIQUÉE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Keycloak URL       : $KeycloakUrl" -ForegroundColor White
Write-Host "🏢 Realm              : $Realm" -ForegroundColor White
Write-Host "🔑 Client ID          : $ClientId" -ForegroundColor White
Write-Host "🔐 Client Secret      : $($ClientSecret.Substring(0, 10))..." -ForegroundColor White
if ($AdminClientSecret) {
    Write-Host "👤 Admin Secret       : Configuré ✅" -ForegroundColor White
} else {
    Write-Host "👤 Admin Secret       : À configurer ⚠️" -ForegroundColor Yellow
}
Write-Host "🌐 Frontend URL       : $FrontendUrl" -ForegroundColor White
Write-Host ""

# Vérifier la configuration
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 VÉRIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Test de connexion à Keycloak..." -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri $KeycloakUrl -Method GET -UseBasicParsing -TimeoutSec 30
    Write-Host "✅ Keycloak est accessible !" -ForegroundColor Green
} catch {
    Write-Host "❌ Keycloak n'est pas accessible" -ForegroundColor Red
    Write-Host "   Vérifiez l'URL : $KeycloakUrl" -ForegroundColor Yellow
}

Write-Host ""

# Test du realm
Write-Host "Test du realm $Realm..." -ForegroundColor White
try {
    $realmUrl = "$KeycloakUrl/realms/$Realm/.well-known/openid-configuration"
    $response = Invoke-RestMethod -Uri $realmUrl -Method GET -TimeoutSec 30
    Write-Host "✅ Realm '$Realm' est accessible !" -ForegroundColor Green
    Write-Host "   Issuer : $($response.issuer)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Realm '$Realm' non trouvé ou non accessible" -ForegroundColor Yellow
    Write-Host "   Assurez-vous de l'avoir créé dans Keycloak admin" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ CONFIGURATION TERMINÉE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Prochaines étapes
Write-Host "📝 PROCHAINES ÉTAPES :" -ForegroundColor White
Write-Host ""
Write-Host "1. Vérifiez le fichier .env.production créé" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Si l'Admin Client Secret n'est pas configuré, ajoutez-le manuellement :" -ForegroundColor Yellow
Write-Host "   KEYCLOAK_ADMIN_CLIENT_SECRET=votre-secret" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Testez localement votre backend :" -ForegroundColor Yellow
Write-Host "   npm run start:prod" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Si tout fonctionne, déployez sur Railway :" -ForegroundColor Yellow
Write-Host "   git add .env.production" -ForegroundColor Cyan
Write-Host "   git commit -m 'Configure Keycloak production'" -ForegroundColor Cyan
Write-Host "   git push" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Ou configurez les variables directement dans Railway :" -ForegroundColor Yellow
Write-Host "   Railway Dashboard → velosi-back → Variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 CONSEIL : Ne committez PAS .env.production sur Git !" -ForegroundColor Yellow
Write-Host "   Utilisez plutôt les variables d'environnement Railway" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Configuration terminée avec succès ! 🎉" -ForegroundColor Green
Write-Host ""

# Proposer d'ouvrir le fichier
$openFile = Read-Host "Voulez-vous ouvrir .env.production pour vérifier ? (O/N)"
if ($openFile -eq "O" -or $openFile -eq "o") {
    code .env.production
}
