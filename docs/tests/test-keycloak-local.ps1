# ============================================
# Script de Test Local - Keycloak Docker
# ============================================
# Ce script lance Keycloak localement avec Docker pour tester avant Railway

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🐳 Test Local Keycloak avec Docker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Docker est installé
Write-Host "🔍 Vérification de Docker..." -ForegroundColor White
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker installé : $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERREUR : Docker n'est pas installé" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Installez Docker Desktop :" -ForegroundColor Yellow
    Write-Host "   https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    exit 1
}

Write-Host ""

# Vérifier que Docker est lancé
Write-Host "🔍 Vérification que Docker est lancé..." -ForegroundColor White
try {
    docker ps | Out-Null
    Write-Host "✅ Docker est lancé" -ForegroundColor Green
} catch {
    Write-Host "❌ ERREUR : Docker n'est pas lancé" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Lancez Docker Desktop et réessayez" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Proposer le choix
Write-Host "📋 CHOIX DU MODE DE TEST :" -ForegroundColor White
Write-Host ""
Write-Host "1. Docker Compose (Recommandé - Keycloak + PostgreSQL)" -ForegroundColor Cyan
Write-Host "2. Docker seul (Keycloak uniquement - utilise H2)" -ForegroundColor Cyan
Write-Host ""
$choice = Read-Host "Votre choix (1 ou 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "🚀 Lancement avec Docker Compose..." -ForegroundColor White
    Write-Host ""
    
    # Vérifier que docker-compose.keycloak.yml existe
    if (-not (Test-Path "docker-compose.keycloak.yml")) {
        Write-Host "❌ ERREUR : docker-compose.keycloak.yml introuvable" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📦 Téléchargement des images..." -ForegroundColor White
    docker-compose -f docker-compose.keycloak.yml pull
    
    Write-Host ""
    Write-Host "🏗️ Build de l'image Keycloak..." -ForegroundColor White
    docker-compose -f docker-compose.keycloak.yml build
    
    Write-Host ""
    Write-Host "🚀 Démarrage des services..." -ForegroundColor White
    docker-compose -f docker-compose.keycloak.yml up -d
    
    Write-Host ""
    Write-Host "⏳ Attente du démarrage (60 secondes)..." -ForegroundColor Yellow
    
    # Afficher les logs en direct pendant 30 secondes
    Start-Job -ScriptBlock {
        docker-compose -f docker-compose.keycloak.yml logs -f keycloak
    } | Out-Null
    
    Start-Sleep -Seconds 30
    
    Write-Host ""
    Write-Host "✅ Services démarrés !" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Status des conteneurs :" -ForegroundColor White
    docker-compose -f docker-compose.keycloak.yml ps
    
    Write-Host ""
    Write-Host "🔗 URLs d'accès :" -ForegroundColor White
    Write-Host "   Keycloak        : http://localhost:8080" -ForegroundColor Cyan
    Write-Host "   Admin Console   : http://localhost:8080/admin" -ForegroundColor Cyan
    Write-Host "   PostgreSQL      : localhost:5433" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔑 Credentials :" -ForegroundColor White
    Write-Host "   Username        : admin" -ForegroundColor Cyan
    Write-Host "   Password        : admin123" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Commandes utiles :" -ForegroundColor White
    Write-Host "   Voir les logs   : docker-compose -f docker-compose.keycloak.yml logs -f" -ForegroundColor Gray
    Write-Host "   Arrêter         : docker-compose -f docker-compose.keycloak.yml down" -ForegroundColor Gray
    Write-Host "   Redémarrer      : docker-compose -f docker-compose.keycloak.yml restart" -ForegroundColor Gray
    
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "🚀 Lancement avec Docker seul..." -ForegroundColor White
    Write-Host ""
    
    # Vérifier si le conteneur existe déjà
    $existingContainer = docker ps -a --filter "name=keycloak-test" --format "{{.Names}}"
    if ($existingContainer) {
        Write-Host "⚠️ Un conteneur 'keycloak-test' existe déjà" -ForegroundColor Yellow
        $remove = Read-Host "Voulez-vous le supprimer ? (O/N)"
        if ($remove -eq "O" -or $remove -eq "o") {
            docker rm -f keycloak-test
            Write-Host "✅ Conteneur supprimé" -ForegroundColor Green
        } else {
            Write-Host "❌ Abandon" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host "📦 Téléchargement de l'image Keycloak..." -ForegroundColor White
    docker pull quay.io/keycloak/keycloak:26.0.7
    
    Write-Host ""
    Write-Host "🚀 Démarrage de Keycloak..." -ForegroundColor White
    docker run -d `
        --name keycloak-test `
        -p 8080:8080 `
        -e KEYCLOAK_ADMIN=admin `
        -e KEYCLOAK_ADMIN_PASSWORD=admin123 `
        quay.io/keycloak/keycloak:26.0.7 `
        start-dev
    
    Write-Host ""
    Write-Host "⏳ Attente du démarrage (60 secondes)..." -ForegroundColor Yellow
    
    # Vérifier l'état du conteneur
    $count = 0
    $maxAttempts = 60
    $ready = $false
    
    while ($count -lt $maxAttempts -and -not $ready) {
        Start-Sleep -Seconds 1
        $count++
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080" -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $ready = $true
                break
            }
        } catch {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host ""
    
    if ($ready) {
        Write-Host "✅ Keycloak est prêt !" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Keycloak prend plus de temps que prévu..." -ForegroundColor Yellow
        Write-Host "   Vérifiez les logs : docker logs -f keycloak-test" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🔗 URLs d'accès :" -ForegroundColor White
    Write-Host "   Keycloak        : http://localhost:8080" -ForegroundColor Cyan
    Write-Host "   Admin Console   : http://localhost:8080/admin" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔑 Credentials :" -ForegroundColor White
    Write-Host "   Username        : admin" -ForegroundColor Cyan
    Write-Host "   Password        : admin123" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Commandes utiles :" -ForegroundColor White
    Write-Host "   Voir les logs   : docker logs -f keycloak-test" -ForegroundColor Gray
    Write-Host "   Arrêter         : docker stop keycloak-test" -ForegroundColor Gray
    Write-Host "   Supprimer       : docker rm -f keycloak-test" -ForegroundColor Gray
    
} else {
    Write-Host "❌ Choix invalide" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎯 PROCHAINES ÉTAPES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ouvrez http://localhost:8080/admin dans votre navigateur" -ForegroundColor Yellow
Write-Host "2. Connectez-vous avec admin / admin123" -ForegroundColor Yellow
Write-Host "3. Créez un Realm 'ERP_Velosi'" -ForegroundColor Yellow
Write-Host "4. Créez un Client 'velosi_auth'" -ForegroundColor Yellow
Write-Host "5. Testez l'authentification" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Si tout fonctionne, vous êtes prêt pour Railway !" -ForegroundColor Green
Write-Host ""

# Proposer d'ouvrir le navigateur
$openBrowser = Read-Host "Voulez-vous ouvrir Keycloak dans le navigateur ? (O/N)"
if ($openBrowser -eq "O" -or $openBrowser -eq "o") {
    Start-Process "http://localhost:8080/admin"
}

Write-Host ""
Write-Host "✅ Script terminé !" -ForegroundColor Green
Write-Host ""
