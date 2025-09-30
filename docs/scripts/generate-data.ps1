# Script PowerShell pour générer les données de test Velosi Transport
# Usage: .\generate-data.ps1 [options]

param(
    [switch]$Clean,
    [switch]$NoKeycloak,
    [switch]$Help
)

Write-Host "🚀 Générateur de données de test Velosi Transport" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

if ($Help) {
    Write-Host "Usage: .\generate-data.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Clean        Nettoyer les données existantes avant génération"
    Write-Host "  -NoKeycloak   Générer sans synchroniser avec Keycloak"
    Write-Host "  -Help         Afficher cette aide"
    Write-Host ""
    Write-Host "Exemples:"
    Write-Host "  .\generate-data.ps1              # Génération normale"
    Write-Host "  .\generate-data.ps1 -Clean       # Nettoyage puis génération"  
    Write-Host "  .\generate-data.ps1 -NoKeycloak  # Sans Keycloak"
    exit 0
}

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "scripts\generate-test-data.ts")) {
    Write-Host "❌ Erreur: Le script doit être exécuté depuis le répertoire velosi-back" -ForegroundColor Red
    Write-Host "Usage: cd velosi-back; .\scripts\generate-data.ps1" -ForegroundColor Yellow
    exit 1
}

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    Write-Host "Téléchargez Node.js depuis: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Vérifier que npm est installé
try {
    $npmVersion = npm --version 2>$null
    Write-Host "✅ npm détecté: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm n'est pas installé" -ForegroundColor Red
    exit 1
}

# Vérifier la configuration
if (-not (Test-Path ".env")) {
    Write-Host "❌ Fichier .env manquant" -ForegroundColor Red
    Write-Host "Copiez le fichier .env.example et configurez vos paramètres" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Vérification des dépendances..." -ForegroundColor Blue

# Vérifier si ts-node est installé
try {
    npx ts-node --version 2>$null | Out-Null
    Write-Host "✅ ts-node disponible" -ForegroundColor Green
} catch {
    Write-Host "📥 Installation de ts-node..." -ForegroundColor Blue
    npm install -g ts-node
}

Write-Host ""
Write-Host "🎯 Configuration:" -ForegroundColor Cyan
Write-Host "   - Base de données: PostgreSQL" -ForegroundColor White
Write-Host "   - Keycloak: http://localhost:8080" -ForegroundColor White  
Write-Host "   - Realm: ERP_Velosi" -ForegroundColor White
Write-Host ""

# Déterminer les options de lancement
$scriptArgs = ""

if ($Clean) {
    Write-Host "🧹 Mode: Nettoyage et génération complète" -ForegroundColor Yellow
    $scriptArgs += " --clean"
}

if ($NoKeycloak) {
    Write-Host "🔒 Mode: Sans synchronisation Keycloak" -ForegroundColor Yellow
    $scriptArgs += " --no-keycloak"
}

if (-not $Clean -and -not $NoKeycloak) {
    Write-Host "📊 Mode: Génération standard" -ForegroundColor Cyan
}

# Exécuter le script
Write-Host "⚡ Démarrage de la génération..." -ForegroundColor Green
try {
    if ($scriptArgs) {
        Invoke-Expression "npx ts-node scripts/generate-test-data.ts$scriptArgs"
    } else {
        npx ts-node scripts/generate-test-data.ts
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✨ Script terminé avec succès !" -ForegroundColor Green
        Write-Host "🔗 Accédez à votre application sur http://localhost:4200" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🔐 Mots de passe par défaut:" -ForegroundColor Yellow
        Write-Host "   - Personnel: VelosiPersonnel2024!" -ForegroundColor White
        Write-Host "   - Clients: VelosiClient2024!" -ForegroundColor White
    } else {
        Write-Host "❌ Le script s'est terminé avec des erreurs" -ForegroundColor Red
    }
} catch {
    Write-Host "💥 Erreur lors de l'exécution: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}